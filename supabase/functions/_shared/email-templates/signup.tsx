/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="it" dir="ltr">
    <Head />
    <Preview>Conferma la tua email per {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://ukvlnokihyghgbssamea.supabase.co/storage/v1/object/public/email-assets/logo.png" alt="PetHotelManager" width="180" height="auto" style={logo} />
        <Heading style={h1}>Conferma la tua email</Heading>
        <Text style={text}>
          Grazie per esserti registrato su{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          !
        </Text>
        <Text style={text}>
          Conferma il tuo indirizzo email (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) cliccando il pulsante qui sotto:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Verifica Email
        </Button>
        <Text style={footer}>
          Se non hai creato un account, puoi ignorare questa email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const logo = { margin: '0 0 20px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(20, 25%, 12%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(20, 10%, 45%)',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const link = { color: 'inherit', textDecoration: 'underline' }
const button = {
  backgroundColor: 'hsl(25, 75%, 47%)',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '10px',
  padding: '12px 24px',
  textDecoration: 'none',
  display: 'inline-block' as const,
  textAlign: 'center' as const,
  fontWeight: 'bold' as const,
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
