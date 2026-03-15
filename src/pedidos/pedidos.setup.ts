import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

@Injectable()
export class PedidosSetup implements OnModuleInit {
  private readonly logger = new Logger(PedidosSetup.name);

  constructor(private readonly amqpConnection: AmqpConnection) {}

  async onModuleInit(): Promise<void> {
    await this.amqpConnection.managedChannel.addSetup(async (channel) => {
      this.logger.log('Configurando filas e bindings de pedidos no RabbitMQ');

      // Filas principais
      await channel.assertQueue('pedidos.criados', {
        durable: true,
        deadLetterExchange: 'pedidos.retry.exchange',
        deadLetterRoutingKey: 'pedidos.criados.retry',
      });

      await channel.assertQueue('pedidos.criados.retry', {
        durable: true,
        messageTtl: 30_000,
        deadLetterExchange: 'pedidos.exchange',
        deadLetterRoutingKey: 'pedido.criado',
      });

      await channel.assertQueue('pedidos.criados.parking-lot', {
        durable: true,
      });

      await channel.assertQueue('pedidos.concluidos', {
        durable: true,
      });

      // Bindings
      await channel.bindQueue(
        'pedidos.criados',
        'pedidos.exchange',
        'pedido.criado',
      );

      await channel.bindQueue(
        'pedidos.criados.retry',
        'pedidos.retry.exchange',
        'pedidos.criados.retry',
      );

      await channel.bindQueue(
        'pedidos.criados.parking-lot',
        'pedidos.parking-lot.exchange',
        'pedidos.criados.parking-lot',
      );

      await channel.bindQueue(
        'pedidos.concluidos',
        'pedidos.concluidos.exchange',
        'pedido.concluido',
      );

      this.logger.log('Filas e bindings de pedidos configurados');
    });
  }
}

