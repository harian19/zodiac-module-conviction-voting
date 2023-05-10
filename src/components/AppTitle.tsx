import { Link, Text, Title } from '@gnosis.pm/safe-react-components'
import { makeStyles } from '@material-ui/core'
import React from 'react'

const AppTitle = () => {
  const styles = useStyles()
  return (
    <div>
      <Title strong size="lg">
        <div className={styles.titleTextContainer}>Conviction Voting</div>
        <Text className={styles.zodiacHelpText} color="placeHolder" size="lg">
          {' '}
          Visit{' '}
          <Link
            className={styles.zodiacLink}
            color="secondary"
            target="_blank"
            size="lg"
            href={'https://zodiac.wiki/index.php/Introduction:_Zodiac_Standard'}
          >
            {' '}
            Zodiac
          </Link>{' '}
          to understand how modules work.
        </Text>
      </Title>
    </div>
  )
}

export default AppTitle

const useStyles = makeStyles(() => ({
  titleTextContainer: {
    marginTop: '-32px',
  },
  zodiacHelpText: {
    paddingTop: '2px'
  },
  zodiacLink: {
    textDecoration: 'underline !important',
  },
}))
