import React from 'react'
import ReactDOM from 'react-dom'
import 'normalize.css';
import { ThemeProvider } from 'styled-components'
import { theme } from '@gnosis.pm/safe-react-components'

// import { theme, Loader, Title } from '@gnosis.pm/safe-react-components'
// import SafeProvider from '@safe-global/safe-apps-react-sdk'

// import GlobalStyle from './GlobalStyle'
import App from './App'

ReactDOM.render(
  <div style={{ margin: '0' }}>
      <ThemeProvider theme={theme}>
          <App />
      </ThemeProvider>
  </div>,
  document.getElementById('root'),
)
