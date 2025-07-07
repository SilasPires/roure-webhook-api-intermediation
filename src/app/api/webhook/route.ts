// src/app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Verifica o contactId
    if (body.contactId === '557781243447') {
      const urlDestino =
        'https://silaspires.app.n8n.cloud/webhook/65964eb7-85d4-4bd0-85c6-16ba3ecd40f8'

      // Envia o mesmo webhook para a URL de destino
      const response = await fetch(urlDestino, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        console.error(
          'Erro ao enviar o webhook para a URL destino:',
          await response.text()
        )
      }
    }

    return NextResponse.json({ status: 'ok', received: true })
  } catch (error) {
    console.error('Erro no webhook:', error)
    return NextResponse.json(
      { error: 'Erro ao processar webhook' },
      { status: 500 }
    )
  }
}
