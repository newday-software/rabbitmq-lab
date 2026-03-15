import { Module } from '@nestjs/common';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { PedidosSetup } from './pedidos.setup';
import { PedidosHandler } from './pedidos.handler';
import { PedidosPublisher } from './pedidos.publisher';
import { PedidosController } from './pedidos.controller';

@Module({
  imports: [
    RabbitMQModule.forRoot({
      uri: process.env.RABBITMQ_URL ?? 'amqp://root:root@localhost:5672',
      exchanges: [
        {
          name: 'pedidos.exchange',
          type: 'topic',
        },
        {
          name: 'pedidos.retry.exchange',
          type: 'topic',
        },
        {
          name: 'pedidos.parking-lot.exchange',
          type: 'topic',
        },
        {
          name: 'pedidos.concluidos.exchange',
          type: 'topic',
        },
      ],
      connectionInitOptions: {
        wait: true,
        timeout: 30000,
      },
    }),
  ],
  controllers: [PedidosController],
  providers: [PedidosSetup, PedidosHandler, PedidosPublisher],
  exports: [PedidosPublisher],
})
export class PedidosModule {}

