// src/app/api/get-chat/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
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
    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get('customerId')

    if (!customerId) {
      log('CustomerId não fornecido')
      return NextResponse.json(
        { error: 'customerId é obrigatório' },
        { status: 400 }
      )
    }

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

    return NextResponse.json({
      status: 'ok',
      data: chatInfo,
      iatrigger: chatInfo.variables?.iatrigger,
    })
  } catch (error) {
    log('Erro inesperado ao buscar chat', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    )
  } finally {
    log('Busca de chat concluída', {
      totalDuration: `${Date.now() - startTime}ms`,
    })
  }
}
