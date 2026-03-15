import { Injectable, Logger } from '@nestjs/common';
import {
  RabbitSubscribe,
  MessageHandlerErrorBehavior,
} from '@golevelup/nestjs-rabbitmq';
import type { ConsumeMessage } from 'amqplib';
import type { RabbitHandlerConfig } from '@golevelup/nestjs-rabbitmq';
import type {
  PedidoParkingLotPayload,
  PedidoPayload,
} from './pedidos.publisher';
import { PedidosPublisher } from './pedidos.publisher';

type XDeathHeader = {
  count?: number;
};

function getTentativasFromMessage(msg: ConsumeMessage): number {
  const raw = msg.properties.headers['x-death'] as XDeathHeader[] | undefined;
  if (!raw || raw.length === 0) {
    return 0;
  }

  const count = raw[0]?.count;
  return typeof count === 'number' ? count : 0;
}

@Injectable()
export class PedidosHandler {
  private readonly logger = new Logger(PedidosHandler.name);
  private readonly maxTentativas = 3;

  constructor(private readonly publisher: PedidosPublisher) {}

  private static rabbitConfig(queue: string): RabbitHandlerConfig {
    return {
      type: 'subscribe',
      errorBehavior: MessageHandlerErrorBehavior.NACK,
      exchange: '',
      routingKey: '',
      queue,
      createQueueIfNotExists: false,
    };
  }

  @RabbitSubscribe(PedidosHandler.rabbitConfig('pedidos.criados'))
  async handlePedidoCriado(
    msg: PedidoPayload,
    amqpMsg: ConsumeMessage,
  ): Promise<void> {
    const tentativas = getTentativasFromMessage(amqpMsg);
    this.logger.log(
      `Recebido pedido.criado: ${JSON.stringify(msg)} | tentativas=${tentativas}`,
    );

    try {
      await this.simularProcessamento(msg);

      await this.publisher.publicarPedidoConcluido(msg.pedido);
    } catch (err) {
      const proximaTentativa = tentativas + 1;

      if (proximaTentativa > this.maxTentativas) {
        await this.publisher.publicarNoParkingLot(
          msg,
          err,
          proximaTentativa,
        );
        return;
      }

      this.logger.warn(
        `Falha ao processar pedido. Enviando para retry (tentativa ${proximaTentativa} de ${this.maxTentativas}). Erro: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );

      // Lançar erro para que o errorBehavior.NACK faça o NACK(false, false)
      throw err;
    }
  }

  //@RabbitSubscribe(PedidosHandler.rabbitConfig('pedidos.criados.parking-lot'))
  async handlePedidoParkingLot(
    msg: PedidoParkingLotPayload,
    amqpMsg: ConsumeMessage,
  ): Promise<void> {
    this.logger.error(
      `Mensagem em parking-lot recebida: ${JSON.stringify(msg)}`,
    );
  }

  @RabbitSubscribe(PedidosHandler.rabbitConfig('pedidos.concluidos'))
  async handlePedidoConcluido(
    msg: PedidoPayload,
    amqpMsg: ConsumeMessage,
  ): Promise<void> {
    this.logger.log(
      `Pedido concluído consumido em pedidos.concluidos: ${JSON.stringify(msg)}`,
    );
  }

  private async simularProcessamento(msg: PedidoPayload): Promise<void> {
    this.logger.log(
      `Processando pedido ${msg.pedido} (simulação com delay de 1s)`,
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Regra simples para simular falha: qualquer id que contenha "fail" dá erro
    if (msg.pedido.toLowerCase().includes('fail')) {
      throw new Error('Falha simulada no processamento do pedido');
    }
  }
}

