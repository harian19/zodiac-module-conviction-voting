import styled from 'styled-components'
import React from 'react'
import ChainSelector from './ChainSelector'
const Container = styled.div`
  padding: 10px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-size: cover;
  background-position: center center;
`
type ConnectPageProps = {
  children: React.ReactNode
  isBackArrowDisabled?: boolean
}

const AppContainer: React.FC<ConnectPageProps> = ({ children, isBackArrowDisabled }) => {
  function goBack() {
    window.history.back()
  }

  return (
    <Container>
      <ChainSelector />
      {children}
    </Container>
  )
}

AppContainer.defaultProps = {
  isBackArrowDisabled: false,
}

export default AppContainer
