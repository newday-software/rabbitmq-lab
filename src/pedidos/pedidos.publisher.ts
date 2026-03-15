import { Injectable, Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

export interface PedidoPayload {
  pedido: string;
}

export interface PedidoParkingLotPayload extends PedidoPayload {
  erro: string;
  tentativas: number;
  falhadoEm: string;
}

@Injectable()
export class PedidosPublisher {
  private readonly logger = new Logger(PedidosPublisher.name);

  constructor(private readonly amqpConnection: AmqpConnection) {}

  async publicarPedidoCriado(pedido: string): Promise<void> {
    const payload: PedidoPayload = { pedido };
    this.logger.log(`Publicando pedido criado: ${JSON.stringify(payload)}`);

    await this.amqpConnection.publish(
      'pedidos.exchange',
      'pedido.criado',
      payload,
    );
  }

  async publicarPedidoConcluido(pedido: string): Promise<void> {
    const payload: PedidoPayload = { pedido };
    this.logger.log(`Publicando pedido concluído: ${JSON.stringify(payload)}`);

    await this.amqpConnection.publish(
      'pedidos.concluidos.exchange',
      'pedido.concluido',
      payload,
    );
  }

  async publicarNoParkingLot(
    payloadOriginal: PedidoPayload,
    erro: unknown,
    tentativas: number,
  ): Promise<void> {
    const payload: PedidoParkingLotPayload = {
      ...payloadOriginal,
      erro:
        erro instanceof Error
          ? `${erro.name}: ${erro.message}`
          : String(erro),
      tentativas,
      falhadoEm: new Date().toISOString(),
    };

    this.logger.error(
      `Enviando pedido para parking-lot: ${JSON.stringify(payload)}`,
    );

    await this.amqpConnection.publish(
      'pedidos.parking-lot.exchange',
      'pedidos.criados.parking-lot',
      payload,
    );
  }
}

