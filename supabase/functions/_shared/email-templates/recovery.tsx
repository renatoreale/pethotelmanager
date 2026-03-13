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

const LOGO_URL = 'https://ukvlnokihyghgbssamea.supabase.co/storage/v1/object/public/email-assets/logo.png'

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="it" dir="ltr">
    <Head />
    <Preview>Reimposta la tua password per PetHotelManager</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} width="64" height="64" alt="PetHotelManager" style={logoStyle} />
        <Heading style={h1}>Reimposta la tua password</Heading>
        <Text style={text}>
          Abbiamo ricevuto una richiesta per reimpostare la password del tuo account PetHotelManager. Clicca il pulsante qui sotto per scegliere una nuova password.
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
const container = { padding: '32px 28px' }
const logoStyle = { margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2e1f0e', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#6b6259', lineHeight: '1.6', margin: '0 0 25px' }
const button = { backgroundColor: '#c45a12', color: '#faf8f5', fontSize: '14px', fontWeight: '600' as const, borderRadius: '10px', padding: '12px 24px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
