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
    log('Webhook recebido - payload completo', {
      fullPayload: body,
      headers: Object.fromEntries(req.headers.entries()),
    })

    // Primeiro validamos o payload mínimo necessário
    if (!body.customerId) {
      log('CustomerId não encontrado no webhook')
      return NextResponse.json(
        { error: 'customerId é obrigatório' },
        { status: 400 }
      )
    }

    // Respondemos imediatamente com 200 OK
    const response = NextResponse.json({
      status: 'ok',
      received: true,
      message: 'Webhook recebido com sucesso',
    })

    // Processamento após a resposta (não bloqueante)
    setTimeout(async () => {
      try {
        const processStart = Date.now()
        log('Iniciando processamento pós-resposta', {
          customerId: body.customerId,
        })

        // Busca informações do chat
        const chatInfoUrl = `https://api.botmaker.com/v2.0/chats/${body.customerId}`
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
            customerId: body.customerId,
          })
          return
        }

        const chatInfo = await chatInfoResponse.json()
        log('Informações do chat obtidas', {
          customerId: body.customerId,
          iatrigger: chatInfo.variables?.iatrigger,
        })

        // Verifica iatrigger
        if (chatInfo.variables?.iatrigger === 'on') {
          const urlDestino =
            'https://n8n.srv903228.hstgr.cloud/webhook/65964eb7-85d4-4bd0-85c6-16ba3ecd40f8'
          log('Encaminhando webhook', { urlDestino })

          const forwardResponse = await fetch(urlDestino, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          })

          if (!forwardResponse.ok) {
            const errorText = await forwardResponse.text()
            log('Erro no encaminhamento', {
              status: forwardResponse.status,
              error: errorText,
            })
          } else {
            log('Webhook encaminhado com sucesso')
          }
        } else {
          log('Webhook não encaminhado - iatrigger não está "on"')
        }

        log('Processamento concluído', {
          duration: `${Date.now() - processStart}ms`,
        })
      } catch (error) {
        log('Erro no processamento assíncrono', {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        })
      }
    }, 0) // setTimeout com 0 para executar no próximo ciclo de evento

    return response
  } catch (error) {
    log('Erro inesperado no recebimento do webhook', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { error: 'Erro ao processar webhook' },
      { status: 500 }
    )
  } finally {
    log('Resposta do webhook enviada', {
      totalDuration: `${Date.now() - startTime}ms`,
    })
  }
}
