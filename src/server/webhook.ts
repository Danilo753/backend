import { Router } from 'express';
import { db } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const router = Router();

router.post('/', async (req, res) => {
  const data = req.body;

  console.log("📩 Webhook recebido:", JSON.stringify(data, null, 2));

  // Verifica se é o evento de confirmação de pagamento
  if (data.event === 'PAYMENT_CONFIRMED') {
    const externalId = data.payment?.externalReference;

    if (externalId) {
      try {
        console.log(`🔄 Atualizando reserva com ID: ${externalId}`);
        
        const reservaRef = doc(db, 'reservas', externalId);

        await updateDoc(reservaRef, {
          status: 'pago',
          dataPagamento: new Date()
        });

        console.log(`✅ Pagamento confirmado e reserva atualizada: ${externalId}`);
        res.sendStatus(200);
      } catch (error) {
        console.error('❌ Erro ao atualizar reserva:', error);
        res.status(500).send('Erro ao processar o webhook');
      }
    } else {
      console.warn("⚠️ externalReference ausente no webhook.");
      res.status(400).send('externalReference ausente');
    }
  } else {
    // Qualquer outro evento, apenas loga e ignora
    console.log(`📭 Evento ignorado: ${data.event}`);
    res.sendStatus(200);
  }
  console.log("📌 Evento bruto:", data.event, "|", typeof data.event);
  console.log("📌 Comparação direta:", data.event === 'PAYMENT_CONFIRMED');

});

export default router;
