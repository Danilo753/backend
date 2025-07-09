"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const firebase_1 = require("../services/firebase");
const firestore_1 = require("firebase/firestore");
const router = (0, express_1.Router)();
router.post('/', async (req, res) => {
    const data = req.body;
    console.log("📩 Webhook recebido:", JSON.stringify(data, null, 2));
    if (data.event === 'PAYMENT_CONFIRMED') {
        const externalId = data.payment?.externalReference;
        if (externalId) {
            try {
                const reservaRef = (0, firestore_1.doc)(firebase_1.db, 'reservas', externalId);
                await (0, firestore_1.updateDoc)(reservaRef, {
                    status: 'pago',
                    dataPagamento: new Date(),
                });
                console.log(`✅ Pagamento confirmado para reserva ${externalId}`);
            }
            catch (error) {
                console.error('❌ Erro ao atualizar reserva:', error);
            }
        }
        else {
            console.warn("⚠️ externalReference não encontrado no payload.");
        }
    }
    else {
        console.log(`📭 Evento ignorado: ${data.event}`);
    }
    res.sendStatus(200);
});
exports.default = router;
