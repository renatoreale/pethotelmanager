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

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

const LOGO_URL = 'https://ukvlnokihyghgbssamea.supabase.co/storage/v1/object/public/email-assets/logo.png'

export const EmailChangeEmail = ({ siteName, email, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <Html lang="it" dir="ltr">
    <Head />
    <Preview>Conferma il cambio email per PetHotelManager</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} width="64" height="64" alt="PetHotelManager" style={logoStyle} />
        <Heading style={h1}>Conferma il cambio email</Heading>
        <Text style={text}>
          Hai richiesto di cambiare il tuo indirizzo email per PetHotelManager da{' '}
          <Link href={`mailto:${email}`} style={link}>{email}</Link>{' '}
          a{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Conferma Cambio Email
        </Button>
        <Text style={footer}>
          Se non hai richiesto questa modifica, metti subito in sicurezza il tuo account.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const logoStyle = { margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2e1f0e', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#6b6259', lineHeight: '1.6', margin: '0 0 25px' }
const link = { color: 'inherit', textDecoration: 'underline' }
const button = { backgroundColor: '#c45a12', color: '#faf8f5', fontSize: '14px', fontWeight: '600' as const, borderRadius: '10px', padding: '12px 24px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
