import { ethers } from "ethers";

export function getFormattedRequestAmount(_maxRatio:bigint, _avatarBalance:bigint) : string {
    return addCommas(ethers.formatEther((_maxRatio * _avatarBalance) / BigInt(10000000)))
}

export function getConvictionPercentageFromThreshold(_conviction : string, _threshold : string) : number {
    return 100 *
        (Number((BigInt(_conviction) * BigInt(10 ** 18)) / BigInt(_threshold)) /
          Number(BigInt(10 ** 18))) 
}

export function ellipsizeAddress(address: string) {
    if (!address || typeof address !== 'string') {
      return '';
    }
    const start = address.substring(0, 5);
    const ellipsis = '...';
    const end = address.substring(address.length - 4);

      return `${start}${ellipsis}${end}`;
  }

export function addCommas(number: string) {
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }