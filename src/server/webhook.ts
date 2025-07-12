import { Router } from 'express';
import { db } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const router = Router();

router.post('/', async (req, res) => {
  const data = req.body;

  console.log("📩 Webhook recebido:", JSON.stringify(data, null, 2));

  if (data.event === 'PAYMENT_CONFIRMED') {
    const externalId = data.payment?.externalReference;

    if (externalId) {
      try {
        console.log(`Tentando atualizar reserva com ID: ${externalId}`);
        const reservaRef = doc(db, 'reservas', externalId);
        await updateDoc(reservaRef, {
          status: 'pago',
          dataPagamento: new Date(),
        });

        console.log(`✅ Pagamento confirmado para reserva ${externalId}`);
        res.sendStatus(200);
      } catch (error) {
        console.error('❌ Erro ao atualizar reserva:', error);
        res.status(500).send('Erro ao processar o webhook');
      }
    } else {
      console.warn("⚠️ externalReference não encontrado no payload.");
      res.status(400).send('externalReference não encontrado');
    }
  } else {
    console.log(`📭 Evento ignorado: ${data.event}`);
    res.sendStatus(200);
  }
});

export default router;
