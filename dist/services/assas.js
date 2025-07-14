"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.criarCobrancaHandler = criarCobrancaHandler;
const reservas_1 = require("./reservas");
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("./firebase");
async function criarCobrancaHandler(req, res) {
    const { nome, email, valor, cpf, telefone, atividade, data, horario, participantes, billingType, } = req.body;
    console.log("📥 Dados recebidos:", req.body);
    // Normalizar horário (caso venha com espaços extras)
    const horarioFormatado = horario?.toString().trim();
    if (!nome ||
        !email ||
        !valor ||
        !cpf ||
        !telefone ||
        !atividade ||
        !data ||
        !horarioFormatado ||
        !participantes ||
        !billingType) {
        res.status(400).json({
            status: "erro",
            error: "Dados incompletos. Todos os campos são obrigatórios.",
        });
        return;
    }
    if (!["PIX", "CREDIT_CARD"].includes(billingType)) {
        res.status(400).json({
            status: "erro",
            error: "Forma de pagamento inválida. Use 'PIX' ou 'CREDIT_CARD'.",
        });
        return;
    }
    try {
        // 🔍 Consulta Firestore para verificar limite de participantes
        const reservasQuery = (0, firestore_1.query)((0, firestore_1.collection)(firebase_1.db, "reservas"), (0, firestore_1.where)("Data", "==", data), (0, firestore_1.where)("Horario", "==", horarioFormatado));
        console.log("🧪 Verificando reservas existentes para:", data, horarioFormatado);
        const snapshot = await (0, firestore_1.getDocs)(reservasQuery);
        console.log("📄 Total de reservas encontradas:", snapshot.size);
        let totalReservados = 0;
        snapshot.forEach((doc) => {
            const dados = doc.data();
            console.log("➡️ Reserva encontrada:", dados);
            totalReservados += dados.Participantes || 0;
        });
        if (totalReservados + participantes > 30) {
            console.warn("🚫 Limite de 30 participantes excedido.");
            res.status(400).json({
                status: "erro",
                error: "Limite de 30 pessoas por horário atingido. Escolha outro horário.",
            });
            return;
        }
        // ✅ Criar reserva no Firebase
        const reservaId = await (0, reservas_1.criarReserva)({
            nome,
            cpf,
            email,
            telefone,
            atividade,
            valor,
            data,
            participantes,
            horario: horarioFormatado,
            status: "aguardando",
        });
        // 💸 Criar cobrança com Asaas
        const dataHoje = new Date().toISOString().split("T")[0];
        const paymentResponse = await fetch("https://api.asaas.com/v3/payments", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                accept: "application/json",
                access_token: process.env.ASAAS_API_KEY,
            },
            body: JSON.stringify({
                billingType,
                customer: "cus_000125881683", // cliente fixo por enquanto
                value: valor,
                dueDate: dataHoje,
                description: `Cobrança de ${nome}`,
                externalReference: reservaId,
            }),
        });
        const cobrancaData = await paymentResponse.json();
        if (!paymentResponse.ok) {
            console.error("❌ Erro ao criar cobrança:", cobrancaData);
            res.status(400).json({ status: "erro", erro: cobrancaData });
            return;
        }
        // ✅ Resposta de sucesso
        res.status(200).json({
            status: "ok",
            cobranca: {
                id: cobrancaData.id,
                status: cobrancaData.status,
                invoiceUrl: cobrancaData.invoiceUrl,
            },
        });
    }
    catch (error) {
        console.error("🔥 Erro inesperado ao criar cobrança:", error);
        res.status(500).json({
            status: "erro",
            error: "Erro interno ao processar a cobrança.",
        });
    }
}
