import { Body, Controller, Post } from '@nestjs/common';
import { PedidosPublisher } from './pedidos.publisher';

class CriarPedidoDto {
  pedido!: string;
}

@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidosPublisher: PedidosPublisher) {}

  @Post()
  async criar(@Body() body: CriarPedidoDto): Promise<{ ok: boolean }> {
    await this.pedidosPublisher.publicarPedidoCriado(body.pedido);
    return { ok: true };
  }
}

