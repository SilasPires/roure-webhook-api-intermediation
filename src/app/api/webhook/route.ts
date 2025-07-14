// src/app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // 1. Responder IMEDIATAMENTE com 200 para a Botmaker
  const response = NextResponse.json({ status: 'received' }, { status: 200 })

  // 2. Processar a lógica em segundo plano (não bloqueante)
  void (async () => {
    const startTime = Date.now()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const log = (message: string, data?: any) => {
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          executionTime: `${Date.now() - startTime}ms`,
          message,
          ...(data && { data }),
        })
      )
    }

    try {
      const body = await req.json()
      log('Webhook recebido (processamento assíncrono)', {
        customerId: body.customerId,
      })

      if (!body.customerId) {
        log('CustomerId não encontrado - ignorando processamento')
        return
      }

      const customerId = body.customerId
      const chatInfoUrl = `https://api.botmaker.com/v2.0/chats/${customerId}`

      const chatInfoResponse = await fetch(chatInfoUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'access-token': process.env.BOTMAKER_ACCESS_TOKEN || '',
        },
      })

      if (!chatInfoResponse.ok) {
        log('Erro na API Botmaker', {
          status: chatInfoResponse.status,
          error: await chatInfoResponse.text(),
        })
        return
      }

      const chatInfo = await chatInfoResponse.json()
      if (chatInfo.variables?.iatrigger === 'on') {
        const urlDestino =
          'https://n8n.srv903228.hstgr.cloud/webhook/65964eb7-85d4-4bd0-85c6-16ba3ecd40f8'
        await fetch(urlDestino, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        log('Webhook encaminhado com sucesso')
      } else {
        log('Webhook não encaminhado - iatrigger não está "on"')
      }
    } catch (error) {
      log('Erro no processamento assíncrono', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      })
    }
  })()

  // 3. Retornar a resposta imediata
  return response
}
