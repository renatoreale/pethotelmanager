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

const LOGO_URL = 'https://ukvlnokihyghgbssamea.supabase.co/storage/v1/object/public/email-assets/logo.png'

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="it" dir="ltr">
    <Head />
    <Preview>Conferma la tua email per PetHotelManager</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} width="64" height="64" alt="PetHotelManager" style={logoStyle} />
        <Heading style={h1}>Conferma la tua email</Heading>
        <Text style={text}>
          Grazie per esserti registrato su{' '}
          <Link href={siteUrl} style={link}>
            <strong>PetHotelManager</strong>
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
const container = { padding: '32px 28px' }
const logoStyle = { margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2e1f0e', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#6b6259', lineHeight: '1.6', margin: '0 0 25px' }
const link = { color: 'inherit', textDecoration: 'underline' }
const button = { backgroundColor: '#c45a12', color: '#faf8f5', fontSize: '14px', fontWeight: '600' as const, borderRadius: '10px', padding: '12px 24px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
