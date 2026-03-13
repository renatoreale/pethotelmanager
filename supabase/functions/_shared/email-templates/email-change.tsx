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

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="it" dir="ltr">
    <Head />
    <Preview>Conferma il cambio email per {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://ukvlnokihyghgbssamea.supabase.co/storage/v1/object/public/email-assets/logo.png" alt="PetHotelManager" width="180" height="auto" style={logo} />
        <Heading style={h1}>Conferma il cambio email</Heading>
        <Text style={text}>
          Hai richiesto di cambiare il tuo indirizzo email per {siteName} da{' '}
          <Link href={`mailto:${email}`} style={link}>
            {email}
          </Link>{' '}
          a{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>
          .
        </Text>
        <Text style={text}>
          Clicca il pulsante qui sotto per confermare:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Conferma Cambio Email
        </Button>
        <Text style={footer}>
          Se non hai richiesto questa modifica, metti in sicurezza il tuo account immediatamente.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

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
  borderRadius: '0.625rem',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
