"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const firebase_1 = require("../services/firebase");
const firestore_1 = require("firebase/firestore");
const emailService_1 = require("../services/emailService");
const router = (0, express_1.Router)();
router.post('/', async (req, res) => {
    const data = req.body;
    console.log("📩 Webhook recebido:", JSON.stringify(data, null, 2));
    // Verifica se é o evento de confirmação de pagamento
    if (data.event === 'PAYMENT_CONFIRMED') {
        const externalId = data.payment?.externalReference;
        if (externalId) {
            try {
                console.log(`🔄 Atualizando reserva com ID: ${externalId}`);
                const reservaRef = (0, firestore_1.doc)(firebase_1.db, 'reservas', externalId);
                await (0, firestore_1.updateDoc)(reservaRef, {
                    status: 'pago',
                    dataPagamento: new Date()
                });
                const reservaSnap = await (0, firestore_1.getDoc)(reservaRef);
                if (!reservaSnap.exists()) {
                    console.warn(`⚠️ Reserva ${externalId} não encontrada para envio de e-mail`);
                    return res.sendStatus(404);
                }
                const reserva = reservaSnap.data();
                await (0, emailService_1.enviarEmailConfirmacao)({
                    nome: reserva.nome,
                    email: reserva.email,
                    atividade: reserva.atividade,
                    data: reserva.data,
                    horario: reserva.horario,
                    participantes: reserva.participantes,
                });
                console.log(`✅ E-mail de confirmação enviado para: ${reserva.email}`);
                res.sendStatus(200);
            }
            catch (error) {
                console.error('❌ Erro ao atualizar reserva ou enviar e-mail:', error);
                res.status(500).send('Erro ao processar o webhook');
            }
        }
        else {
            console.warn("⚠️ externalReference ausente no webhook.");
            res.status(400).send('externalReference ausente');
        }
    }
    console.log("📌 Evento bruto:", data.event, "|", typeof data.event);
    console.log("📌 Comparação direta:", data.event === 'PAYMENT_CONFIRMED');
});
exports.default = router;
