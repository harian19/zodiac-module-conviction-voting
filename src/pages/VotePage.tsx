import React from 'react'
import { makeStyles } from '@material-ui/core/styles'
import { Grid } from '@material-ui/core'
import ModuleInfo from '../components/ModuleInfo'
import Proposals from '../components/Proposals'
import AppContainer from '../components/AppContainer'
import { useSelector } from 'react-redux'
import { RootState } from '../redux/configureStore'

const VotePage: React.FC = () => {
  const styles = useStyles()
  const moduleAddress = useSelector<RootState, string>((state) => state.module.address)

  return (
    <AppContainer>
      <Grid container>
        <Grid item xs={12}>
          <div style={{ marginLeft: '10px' }}>
            <ModuleInfo />
          </div>
        </Grid>
        <Grid item xs={12}>
            <Proposals />
        </Grid>
      </Grid>
    </AppContainer>
  )
}

export default VotePage

const useStyles = makeStyles(() => ({
  explorerButton: {
    display: 'inline !important',
    verticalAlign: 'middle',
  },
}))
