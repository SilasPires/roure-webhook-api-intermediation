// src/app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
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
    log('Webhook recebido', {
      customerId: body.customerId,
      messageType: body.type,
    })

    if (!body.customerId) {
      log('CustomerId não encontrado no webhook', {
        body: JSON.stringify(body),
      })
      return NextResponse.json(
        { error: 'customerId é obrigatório' },
        { status: 400 }
      )
    }

    const customerId = body.customerId
    log('Iniciando busca de informações do chat', { customerId })

    const chatInfoUrl = `https://api.botmaker.com/v2.0/chats/${customerId}`
    const chatInfoResponse = await fetch(chatInfoUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'access-token': process.env.BOTMAKER_ACCESS_TOKEN || '',
      },
    })

    if (!chatInfoResponse.ok) {
      const errorText = await chatInfoResponse.text()
      log('Erro na API Botmaker', {
        status: chatInfoResponse.status,
        error: errorText,
        customerId,
      })
      return NextResponse.json(
        { error: 'Erro ao buscar informações do chat' },
        { status: chatInfoResponse.status }
      )
    }

    const chatInfo = await chatInfoResponse.json()
    log('Informações do chat obtidas', {
      customerId,
      hasVariables: !!chatInfo.variables,
      iatrigger: chatInfo.variables?.iatrigger,
    })

    const iaTrigger = chatInfo.variables?.iatrigger
    if (iaTrigger === 'on') {
      const urlDestino =
        'https://n8n.srv903228.hstgr.cloud/webhook/65964eb7-85d4-4bd0-85c6-16ba3ecd40f8'
      log('Preparando para encaminhar webhook', { urlDestino, customerId })

      const forwardStart = Date.now()
      const response = await fetch(urlDestino, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorText = await response.text()
        log('Erro no encaminhamento do webhook', {
          status: response.status,
          error: errorText,
          customerId,
          duration: `${Date.now() - forwardStart}ms`,
        })
      } else {
        log('Webhook encaminhado com sucesso', {
          customerId,
          duration: `${Date.now() - forwardStart}ms`,
        })
      }

      return NextResponse.json({
        status: 'ok',
        received: true,
        forwarded: true,
      })
    }

    log('Webhook não encaminhado - iatrigger não está "on"', {
      customerId,
      iatriggerValue: iaTrigger,
    })
    return NextResponse.json({
      status: 'ok',
      received: true,
      forwarded: false,
      reason: 'iatrigger not set to "on"',
    })
  } catch (error) {
    log('Erro inesperado no processamento do webhook', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { error: 'Erro ao processar webhook' },
      { status: 500 }
    )
  } finally {
    log('Processamento do webhook concluído', {
      totalDuration: `${Date.now() - startTime}ms`,
    })
  }
}
