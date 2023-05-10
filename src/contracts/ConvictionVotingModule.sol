// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.6;

import '@gnosis.pm/zodiac/contracts/core/Module.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';

contract ConvictionVotingModule is Module, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    uint256 public constant MULTIPLIER_D = 10000000;
    uint256 public constant ONE_HUNDRED_PERCENT = 1e18;
    uint256 private constant TWO_128 = 0x100000000000000000000000000000000; // 2^128
    uint256 private constant TWO_127 = 0x80000000000000000000000000000000; // 2^127
    uint256 private constant INT_MAX = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
    uint256 public constant MAX_STAKED_PROPOSALS = 10;

    enum ProposalStatus {
        Active, // A proposal whose voting has is open
        Cancelled, // A proposal that has been cancelled
        Executed // A proposal that has been executed
    }

    struct Proposal {
        uint256 requestedAmount;
        address beneficiary;
        uint256 stakedTokens;
        uint256 convictionLast;
        uint256 blockLast;
        ProposalStatus proposalStatus;
        mapping(address => uint256) voterStake;
        address submitter;
        string title;
        bytes link;
    }

    ERC20 public stakeToken;
    ERC20 public requestToken;
    uint256 public decay;
    uint256 public maxRatio;
    uint256 public weight;
    uint256 public minThresholdStakePercentage;
    uint256 public proposalCounter;
    uint256 public totalStaked;

    mapping(uint256 => Proposal) internal proposals;
    mapping(address => uint256) internal totalVoterStake;
    mapping(address => uint256[]) internal voterStakedProposals;

    event ConvictionSettingsChanged(
        uint256 decay,
        uint256 maxRatio,
        uint256 weight,
        uint256 minThresholdStakePercentage
    );
    event ProposalAdded(
        address indexed entity,
        uint256 indexed id,
        string title,
        bytes link,
        uint256 amount,
        address beneficiary
    );
    event StakeAdded(
        address indexed entity,
        uint256 indexed id,
        uint256 amount,
        uint256 tokensStaked,
        uint256 totalTokensStaked,
        uint256 conviction
    );
    event StakeWithdrawn(
        address entity,
        uint256 indexed id,
        uint256 amount,
        uint256 tokensStaked,
        uint256 totalTokensStaked,
        uint256 conviction
    );
    event ProposalCancelled(uint256 indexed proposalId);
    event ProposalExecuted(uint256 indexed id, uint256 conviction);

    string private constant ERROR_REQUESTED_AMOUNT_ZERO = 'CV_REQUESTED_AMOUNT_ZERO';
    string private constant ERROR_NO_BENEFICIARY = 'CV_NO_BENEFICIARY';
    string private constant ERROR_PROPOSAL_DOES_NOT_EXIST = 'CV_PROPOSAL_DOES_NOT_EXIST';

    string private constant ERROR_PROPOSAL_NOT_ACTIVE = 'CV_PROPOSAL_NOT_ACTIVE';
    string private constant ERROR_CANNOT_EXECUTE_ZERO_VALUE_PROPOSAL = 'CV_CANNOT_EXECUTE_ZERO_VALUE_PROPOSAL';
    string private constant ERROR_INSUFFICIENT_CONVICION = 'CV_INSUFFICIENT_CONVICION';
    string private constant ERROR_SENDER_CANNOT_CANCEL = 'CV_SENDER_CANNOT_CANCEL';
    string private constant ERROR_AMOUNT_OVER_MAX_RATIO = 'CV_AMOUNT_OVER_MAX_RATIO';
    string private constant ERROR_AMOUNT_CAN_NOT_BE_ZERO = 'CV_AMOUNT_CAN_NOT_BE_ZERO';
    string private constant ERROR_INCORRECT_PROPOSAL_STATUS = 'CV_INCORRECT_PROPOSAL_STATUS';
    string private constant ERROR_STAKING_MORE_THAN_AVAILABLE = 'CV_STAKING_MORE_THAN_AVAILABLE';
    string private constant ERROR_MAX_PROPOSALS_REACHED = 'CV_MAX_PROPOSALS_REACHED';
    string private constant ERROR_WITHDRAW_MORE_THAN_STAKED = 'CV_WITHDRAW_MORE_THAN_STAKED';
    string private constant ERROR_TOKEN_STAKE_FAILED = 'ERROR_TOKEN_STAKE_FAILED';
    string private constant ERROR_TOKEN_APPROVAL_FAILED = 'ERROR_TOKEN_APPROVAL_FAILED';

    modifier proposalExists(uint256 _proposalId) {
        require(_proposalId == 1 || proposals[_proposalId].submitter != address(0), ERROR_PROPOSAL_DOES_NOT_EXIST);
        _;
    }

    constructor(
        address _avatar,
        address _stakeToken,
        address _requestToken,
        uint256 _decay,
        uint256 _maxRatio,
        uint256 _weight,
        uint256 _minThresholdStakePercentage
    ) {
        bytes memory initParams = abi.encode(
            _avatar,
            _stakeToken,
            _requestToken,
            _decay,
            _maxRatio,
            _weight,
            _minThresholdStakePercentage
        );

        setUp(initParams);
    }

    function setUp(bytes memory initParams) public override initializer {
        (
            address _avatar,
            address _stakeToken,
            address _requestToken,
            uint256 _decay,
            uint256 _maxRatio,
            uint256 _weight,
            uint256 _minThresholdStakePercentage
        ) = abi.decode(initParams, (address, address, address, uint256, uint256, uint256, uint256));
        __Ownable_init();
        require(_avatar != address(0), 'Avatar can not be zero address');
        require(_stakeToken != address(0), 'Stake token can not be zero address');

        setAvatar(_avatar);
        setTarget(_avatar);
        transferOwnership(_avatar);
        stakeToken = ERC20(_stakeToken);
        requestToken = ERC20(_requestToken);
        decay = _decay;
        maxRatio = _maxRatio;
        weight = _weight;
        minThresholdStakePercentage = _minThresholdStakePercentage;
        proposalCounter = 0;
    }

    /**
     * @notice Update the conviction voting parameters
     * @param _decay The rate at which conviction is accrued or lost from a proposal
     * @param _maxRatio Proposal threshold parameter
     * @param _weight Proposal threshold parameter
     * @param _minThresholdStakePercentage The minimum percent of stake token max supply that is used for calculating conviction
     */
    function setConvictionCalculationSettings(
        uint256 _decay,
        uint256 _maxRatio,
        uint256 _weight,
        uint256 _minThresholdStakePercentage
    ) external onlyOwner {
        decay = _decay;
        maxRatio = _maxRatio;
        weight = _weight;
        minThresholdStakePercentage = _minThresholdStakePercentage;

        emit ConvictionSettingsChanged(_decay, _maxRatio, _weight, _minThresholdStakePercentage);
    }

    /**
     * @notice Create proposal `_title` for `@tokenAmount((self.requestToken(): address), _requestedAmount)` to `_beneficiary`
     * @param _title Title of the proposal
     * @param _link IPFS or HTTP link with proposal's description
     * @param _requestedAmount Tokens requested
     * @param _beneficiary Address that will receive payment
     */
    function addProposal(
        string memory _title,
        bytes memory _link,
        uint256 _requestedAmount,
        address _beneficiary
    ) external {
        require(_requestedAmount > 0, ERROR_REQUESTED_AMOUNT_ZERO);
        require(_beneficiary != address(0), ERROR_NO_BENEFICIARY);

        _addProposal(_title, _link, _requestedAmount, _beneficiary);
    }

    /**
     * @notice Stake `@tokenAmount((self.stakeToken(): address), _amount)` on proposal #`_proposalId`
     * @param _proposalId Proposal id
     * @param _amount Amount of tokens staked
     */
    function stakeToProposal(uint256 _proposalId, uint256 _amount) external {
        _stake(_proposalId, _amount, msg.sender);
    }

    /**
     * @dev Conviction formula: a^t * y(0) + x * (1 - a^t) / (1 - a)
     * Solidity implementation: y = (2^128 * a^t * y0 + x * D * (2^128 - 2^128 * a^t) / (D - aD) + 2^127) / 2^128
     * @param _timePassed Number of blocks since last conviction record
     * @param _lastConv Last conviction record
     * @param _oldAmount Amount of tokens staked until now
     * @return Current conviction
     */
    function calculateConviction(
        uint256 _timePassed,
        uint256 _lastConv,
        uint256 _oldAmount
    ) public view returns (uint256) {
        uint256 t = uint256(_timePassed);
        // atTWO_128 = 2^128 * a^t
        uint256 atTWO_128 = _pow((decay << 128).div(MULTIPLIER_D), t);
        // solium-disable-previous-line
        // conviction = (atTWO_128 * _lastConv + _oldAmount * D * (2^128 - atTWO_128) / (D - aD) + 2^127) / 2^128
        return
            (
                atTWO_128.mul(_lastConv).add(
                    _oldAmount.mul(MULTIPLIER_D).mul(TWO_128.sub(atTWO_128)).div(MULTIPLIER_D - decay)
                )
            ).add(TWO_127) >> 128;
    }

    function getCurrentConviction(uint256 _proposalId) public view returns (uint256) {
        Proposal storage proposal = proposals[_proposalId];

        require(proposal.proposalStatus == ProposalStatus.Active, ERROR_PROPOSAL_NOT_ACTIVE);

        uint256 blockNumber = block.number;
        assert(proposal.blockLast <= blockNumber);
        if (proposal.blockLast == blockNumber) {
            return proposal.convictionLast; // Conviction already stored
        }
        // calculateConviction and return it
        uint256 conviction = calculateConviction(
            blockNumber - proposal.blockLast, // we assert it doesn't overflow above
            proposal.convictionLast,
            proposal.stakedTokens
        );

        return conviction;
    }

    /**
     * @dev Get proposal details
     * @param _proposalId Proposal id
     * @return requestedAmount Requested amount
     * @return beneficiary Beneficiary address
     * @return stakedTokens Current total stake of tokens on this proposal
     * @return convictionLast Conviction this proposal had last time calculateAndSetConviction was called
     * @return blockLast Block when calculateAndSetConviction was called
     * @return proposalStatus ProposalStatus defining the state of the proposal
     * @return submitter Submitter of the proposal
     * @return link Link to the description of the proposal
     * @return title Title of the proposal
     * @return threshold Calculated threshold
     */
    function getProposal(
        uint256 _proposalId
    )
        external
        view
        returns (
            uint256 requestedAmount,
            address beneficiary,
            uint256 stakedTokens,
            uint256 convictionLast,
            uint256 blockLast,
            ProposalStatus proposalStatus,
            address submitter,
            bytes memory link,
            string memory title,
            uint256 threshold
        )
    {
        Proposal storage proposal = proposals[_proposalId];
        if (proposal.proposalStatus == ProposalStatus.Cancelled || proposal.proposalStatus == ProposalStatus.Executed) {
            threshold = 0;
        }

        threshold = proposal.requestedAmount == 0 ? 0 : calculateThreshold(proposal.requestedAmount);
        return (
            proposal.requestedAmount,
            proposal.beneficiary,
            proposal.stakedTokens,
            proposal.convictionLast,
            proposal.blockLast,
            proposal.proposalStatus,
            proposal.submitter,
            proposal.link,
            proposal.title,
            threshold
        );
    }

    /**
     * @dev Formula: ρ * totalStaked / (1 - a) / (β - requestedAmount / total)**2
     * For the Solidity implementation we amplify ρ and β and simplify the formula:
     * weight = ρ * D
     * maxRatio = β * D
     * decay = a * D
     * threshold = weight * totalStaked * D ** 2 * funds ** 2 / (D - decay) / (maxRatio * funds - requestedAmount * D) ** 2
     * @param _requestedAmount Requested amount of tokens on certain proposal
     * @return _threshold Threshold a proposal's conviction should cross in order to be able to execute it.
     */
    function calculateThreshold(uint256 _requestedAmount) public view returns (uint256 _threshold) {
        uint256 funds;
        if (address(requestToken) == address(0)) {
            funds = avatar.balance;
        } else {
            funds = requestToken.balanceOf(avatar);
        }
        require(maxRatio.mul(funds) > _requestedAmount.mul(MULTIPLIER_D), ERROR_AMOUNT_OVER_MAX_RATIO);
        // denom = maxRatio * 2 ** 64 / D  - requestedAmount * 2 ** 64 / funds
        uint256 denom = (maxRatio << 64).div(MULTIPLIER_D).sub((_requestedAmount << 64).div(funds));
        // _threshold = (weight * 2 ** 128 / D) / (denom ** 2 / 2 ** 64) * totalStaked * D / 2 ** 128
        _threshold =
            ((weight << 128).div(MULTIPLIER_D).div(denom.mul(denom) >> 64))
                .mul(MULTIPLIER_D)
                .div(MULTIPLIER_D.sub(decay))
                .mul(_totalStaked()) >>
            64;
    }

    /**
     * @notice Get stake of voter `_voter` on proposal #`_proposalId`
     * @param _proposalId Proposal id
     * @param _voter Voter address
     * @return Proposal voter stake
     */
    function getProposalVoterStake(uint256 _proposalId, address _voter) external view returns (uint256) {
        return proposals[_proposalId].voterStake[_voter];
    }

    /**
     * @notice Get the total stake of voter `_voter` on all proposals
     * @param _voter Voter address
     * @return Total voter stake
     */
    function getTotalVoterStake(address _voter) external view returns (uint256) {
        return totalVoterStake[_voter];
    }

    /**
     * @notice Get all proposal ID's voter `_voter` has currently staked to
     * @param _voter Voter address
     * @return Voter proposals
     */
    function getVoterStakedProposals(address _voter) external view returns (uint256[] memory) {
        return voterStakedProposals[_voter];
    }

    /**
     * @notice Withdraw `@tokenAmount((self.stakeToken(): address), _amount)` previously staked on proposal #`_proposalId`
     * @param _proposalId Proposal id
     * @param _amount Amount of tokens withdrawn
     */
    function withdrawFromProposal(uint256 _proposalId, uint256 _amount) external proposalExists(_proposalId) {
        _withdrawFromProposal(_proposalId, _amount, msg.sender);
    }

    /**
     * @notice Withdraw all `(self.stakeToken(): address).symbol(): string` tokens previously staked on proposal #`_proposalId`
     * @param _proposalId Proposal id
     */
    function withdrawAllFromProposal(uint256 _proposalId) external proposalExists(_proposalId) {
        _withdrawFromProposal(_proposalId, proposals[_proposalId].voterStake[msg.sender], msg.sender);
    }

    /**
     * @notice Withdraw all callers stake from inactive proposals
     */
    function withdrawFromInactiveProposals() external {
        _withdrawInactiveStakedTokens(uint256(INT_MAX), msg.sender);
    }

    /**
     * @notice Execute proposal #`_proposalId`
     * @dev ...by sending `@tokenAmount((self.requestToken(): address), self.getPropoal(_proposalId): ([uint256], address, uint256, uint256, uint64, bool))` to `self.getPropoal(_proposalId): (uint256, [address], uint256, uint256, uint64, bool)`
     * @param _proposalId Proposal id
     */
    function executeProposal(uint256 _proposalId) external proposalExists(_proposalId) {
        Proposal storage proposal = proposals[_proposalId];

        require(proposal.requestedAmount > 0, ERROR_CANNOT_EXECUTE_ZERO_VALUE_PROPOSAL);
        require(proposal.proposalStatus == ProposalStatus.Active, ERROR_PROPOSAL_NOT_ACTIVE);

        _calculateAndSetConviction(proposal, proposal.stakedTokens);
        require(proposal.convictionLast > calculateThreshold(proposal.requestedAmount), ERROR_INSUFFICIENT_CONVICION);

        proposal.proposalStatus = ProposalStatus.Executed;

        if (address(requestToken) == address(0)) {
            _transferNativeAsset(proposal.beneficiary, proposal.requestedAmount);
        } else {
            _transferToken(address(requestToken), proposal.beneficiary, proposal.requestedAmount);
        }

        emit ProposalExecuted(_proposalId, proposal.convictionLast);
    }

    /**
     * @notice Cancel proposal #`_proposalId`
     * @param _proposalId Proposal id
     */
    function cancelProposal(uint256 _proposalId) external proposalExists(_proposalId) {
        Proposal storage proposal = proposals[_proposalId];

        bool senderHasPermission = proposal.submitter == msg.sender || msg.sender == owner();
        require(senderHasPermission, ERROR_SENDER_CANNOT_CANCEL);
        require(proposal.proposalStatus == ProposalStatus.Active, ERROR_PROPOSAL_NOT_ACTIVE);

        proposal.proposalStatus = ProposalStatus.Cancelled;

        emit ProposalCancelled(_proposalId);
    }

    // @dev Execute a token transfer through the avatar
    // @param token address of token to transfer
    // @param to address that will receive the transfer
    // @param amount to transfer
    function _transferToken(address token, address to, uint256 amount) private {
        // 0xa9059cbb - bytes4(keccak256("transfer(address,uint256)"))
        bytes memory data = abi.encodeWithSelector(0xa9059cbb, to, amount);
        require(exec(token, 0, data, Enum.Operation.Call), 'Error on token transfer');
    }

    // @dev Execute a token transfer through the avatar
    // @param to address that will receive the transfer
    // @param amount to transfer
    function _transferNativeAsset(address to, uint256 amount) private {
        require(exec(to, amount, bytes('0x'), Enum.Operation.Call), 'Error on native asset transfer');
    }

    /**
     * Multiply _a by _b / 2^128.  Parameter _a should be less than or equal to
     * 2^128 and parameter _b should be less than 2^128.
     * @param _a left argument
     * @param _b right argument
     * @return _result = _a * _b / 2^128
     */
    function _mul(uint256 _a, uint256 _b) internal pure returns (uint256 _result) {
        require(_a <= TWO_128, '_a should be less than or equal to 2^128');
        require(_b < TWO_128, '_b should be less than 2^128');
        return _a.mul(_b).add(TWO_127) >> 128;
    }

    /**
     * Calculate (_a / 2^128)^_b * 2^128.  Parameter _a should be less than 2^128.
     *
     * @param _a left argument
     * @param _b right argument
     * @return _result = (_a / 2^128)^_b * 2^128
     */
    function _pow(uint256 _a, uint256 _b) internal pure returns (uint256 _result) {
        require(_a < TWO_128, '_a should be less than 2^128');
        uint256 a = _a;
        uint256 b = _b;
        _result = TWO_128;
        while (b > 0) {
            if (b & 1 == 0) {
                a = _mul(a, a);
                b >>= 1;
            } else {
                _result = _mul(_result, a);
                b -= 1;
            }
        }
    }

    function _addProposal(
        string memory _title,
        bytes memory _link,
        uint256 _requestedAmount,
        address _beneficiary
    ) internal {
        proposalCounter++;
        proposals[proposalCounter].requestedAmount = _requestedAmount;
        proposals[proposalCounter].beneficiary = _beneficiary;
        proposals[proposalCounter].stakedTokens = 0;
        proposals[proposalCounter].convictionLast = 0;
        proposals[proposalCounter].blockLast = 0;
        proposals[proposalCounter].proposalStatus = ProposalStatus.Active;
        proposals[proposalCounter].submitter = msg.sender;
        proposals[proposalCounter].title = _title;
        proposals[proposalCounter].link = _link;

        emit ProposalAdded(msg.sender, proposalCounter, _title, _link, _requestedAmount, _beneficiary);
    }

    /**
     * @dev Stake an amount of tokens on a proposal
     * @param _proposalId Proposal id
     * @param _amount Amount of staked tokens
     * @param _from Account from which we stake
     */
    function _stake(uint256 _proposalId, uint256 _amount, address _from) internal proposalExists(_proposalId) {
        Proposal storage proposal = proposals[_proposalId];
        require(_amount > 0, ERROR_AMOUNT_CAN_NOT_BE_ZERO);
        require(proposal.proposalStatus == ProposalStatus.Active, ERROR_INCORRECT_PROPOSAL_STATUS);

        uint256 unstakedAmount = stakeToken.balanceOf(_from).sub(totalVoterStake[_from]);
        if (_amount > unstakedAmount) {
            _withdrawInactiveStakedTokens(_amount.sub(unstakedAmount), _from);
        }

        require(totalVoterStake[_from].add(_amount) <= stakeToken.balanceOf(_from), ERROR_STAKING_MORE_THAN_AVAILABLE);

        // Transfer the staked tokens from the sender to the contract
        require(stakeToken.transferFrom(_from, address(this), _amount), ERROR_TOKEN_STAKE_FAILED);

        uint256 previousStake = proposal.stakedTokens;
        proposal.stakedTokens = proposal.stakedTokens.add(_amount);
        proposal.voterStake[_from] = proposal.voterStake[_from].add(_amount);
        totalVoterStake[_from] = totalVoterStake[_from].add(_amount);
        totalStaked = totalStaked.add(_amount);

        if (proposal.blockLast == 0) {
            proposal.blockLast = block.number;
        } else {
            _calculateAndSetConviction(proposal, previousStake);
        }

        _updateVoterStakedProposals(_proposalId, _from);

        emit StakeAdded(
            _from,
            _proposalId,
            _amount,
            proposal.voterStake[_from],
            proposal.stakedTokens,
            proposal.convictionLast
        );
    }

    /**
     * @dev Withdraw staked tokens from executed proposals until a target amount is reached.
     * @param _targetAmount Target at which to stop withdrawing tokens
     * @param _from Account to withdraw from
     */
    function _withdrawInactiveStakedTokens(uint256 _targetAmount, address _from) internal {
        uint256 i = 0;
        uint256 toWithdraw;
        uint256 withdrawnAmount = 0;
        uint256[] memory voterStakedProposalsCopy = voterStakedProposals[_from];

        while (i < voterStakedProposalsCopy.length && withdrawnAmount < _targetAmount) {
            uint256 proposalId = voterStakedProposalsCopy[i];
            Proposal storage proposal = proposals[proposalId];

            if (
                proposal.proposalStatus == ProposalStatus.Executed ||
                proposal.proposalStatus == ProposalStatus.Cancelled
            ) {
                toWithdraw = proposal.voterStake[_from];
                if (toWithdraw > 0) {
                    _withdrawFromProposal(proposalId, toWithdraw, _from);
                    withdrawnAmount = withdrawnAmount.add(toWithdraw);
                }
            }
            i++;
        }
    }

    /**
     * @dev Withdraw an amount of tokens from a proposal
     * @param _proposalId Proposal id
     * @param _amount Amount of withdrawn tokens
     * @param _from Account to withdraw from
     */
    function _withdrawFromProposal(uint256 _proposalId, uint256 _amount, address _from) internal {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.voterStake[_from] >= _amount, ERROR_WITHDRAW_MORE_THAN_STAKED);
        require(_amount > 0, ERROR_AMOUNT_CAN_NOT_BE_ZERO);

        // Approve the contract to transfer the specified amount of tokens
        require(stakeToken.approve(address(this), _amount), ERROR_TOKEN_APPROVAL_FAILED);

        // Transfer the staked tokens from the contract to the sender
        require(stakeToken.transferFrom(address(this), _from, _amount), ERROR_TOKEN_STAKE_FAILED);

        uint256 previousStake = proposal.stakedTokens;
        proposal.stakedTokens = proposal.stakedTokens.sub(_amount);
        proposal.voterStake[_from] = proposal.voterStake[_from].sub(_amount);
        totalVoterStake[_from] = totalVoterStake[_from].sub(_amount);
        totalStaked = totalStaked.sub(_amount);

        if (proposal.voterStake[_from] == 0) {
            _removeElement(voterStakedProposals[_from], _proposalId);
        }

        if (proposal.proposalStatus == ProposalStatus.Active) {
            _calculateAndSetConviction(proposal, previousStake);
        }

        emit StakeWithdrawn(
            _from,
            _proposalId,
            _amount,
            proposal.voterStake[_from],
            proposal.stakedTokens,
            proposal.convictionLast
        );
    }

    function _updateVoterStakedProposals(uint256 _proposalId, address _submitter) internal {
        uint256[] storage voterStakedProposalsArray = voterStakedProposals[_submitter];

        if (!itemExists(voterStakedProposalsArray, _proposalId)) {
            require(voterStakedProposalsArray.length < MAX_STAKED_PROPOSALS, ERROR_MAX_PROPOSALS_REACHED);
            voterStakedProposalsArray.push(_proposalId);
        }
    }

    function _totalStaked() internal view returns (uint256) {
        uint256 minTotalStake = (stakeToken.totalSupply().mul(minThresholdStakePercentage)).div(ONE_HUNDRED_PERCENT);
        return totalStaked < minTotalStake ? minTotalStake : totalStaked;
    }

    /**
     * @dev Calculate conviction and store it on the proposal
     * @param _proposal Proposal
     * @param _oldStaked Amount of tokens staked on a proposal until now
     */
    function _calculateAndSetConviction(Proposal storage _proposal, uint256 _oldStaked) internal {
        uint256 blockNumber = block.number;
        assert(_proposal.blockLast <= blockNumber);
        if (_proposal.blockLast == blockNumber) {
            return; // Conviction already stored
        }
        // calculateConviction and store it
        uint256 conviction = calculateConviction(
            blockNumber - _proposal.blockLast, // we assert it doesn't overflow above
            _proposal.convictionLast,
            _oldStaked
        );
        _proposal.blockLast = blockNumber;
        _proposal.convictionLast = conviction;
    }

    function itemExists(uint256[] memory arr, uint256 item) internal pure returns (bool) {
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i] == item) {
                return true;
            }
        }
        return false;
    }

    function _removeElement(uint256[] storage arr, uint256 index) internal {
        require(index < arr.length, 'Index out of bounds');
        for (uint256 i = index; i < arr.length - 1; i++) {
            arr[i] = arr[i + 1];
        }
        arr.pop();
    }
}
