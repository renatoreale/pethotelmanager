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
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="it" dir="ltr">
    <Head />
    <Preview>Reimposta la tua password per {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://ukvlnokihyghgbssamea.supabase.co/storage/v1/object/public/email-assets/logo.png" alt="PetHotelManager" width="180" height="auto" style={logo} />
        <Heading style={h1}>Reimposta la tua password</Heading>
        <Text style={text}>
          Abbiamo ricevuto una richiesta di reimpostazione della password per {siteName}. Clicca il pulsante qui sotto per scegliere una nuova password.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Reimposta Password
        </Button>
        <Text style={footer}>
          Se non hai richiesto il reset della password, puoi ignorare questa email. La tua password non verrà modificata.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

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
const button = {
  backgroundColor: 'hsl(25, 75%, 47%)',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '0.625rem',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
