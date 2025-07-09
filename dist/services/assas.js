"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.criarCobrancaHandler = criarCobrancaHandler;
const reservas_1 = require("./reservas");
async function criarCobrancaHandler(req, res) {
    const { nome, email, valor, cpf, telefone, atividade, data, participantes } = req.body;
    // ✅ Validação básica
    if (!nome || !email || !valor || !cpf || !telefone || !atividade || !data || !participantes) {
        res.status(400).json({
            status: "erro",
            error: "Dados incompletos. Todos os campos são obrigatórios.",
        });
        return;
    }
    try {
        // 🔹 1. Criar a reserva no Firebase
        const reservaId = await (0, reservas_1.criarReserva)({
            nome,
            cpf,
            email,
            telefone,
            atividade,
            valor,
            data,
            participantes,
            status: "aguardando",
        });
        // 🔹 2. Criar a cobrança no Asaas
        const dataHoje = new Date().toISOString().split("T")[0]; // garante formato YYYY-MM-DD
        const response = await fetch("https://api-sandbox.asaas.com/v3/payments", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                accept: "application/json",
                access_token: process.env.ASAAS_API_KEY,
            },
            body: JSON.stringify({
                billingType: "CREDIT_CARD", // ou "PIX"
                customer: "cus_000006520394", // ID do cliente temporário
                value: valor,
                dueDate: dataHoje,
                description: `Cobrança de ${nome}`,
                externalReference: reservaId, // vincula reserva ao pagamento
            }),
        });
        const cobrancaData = await response.json();
        if (!response.ok) {
            console.error("Erro ao criar cobrança:", cobrancaData);
            res.status(400).json({ status: "erro", erro: cobrancaData });
            return;
        }
        // 🔹 3. Retornar a resposta da cobrança
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
        console.error("Erro ao criar cobrança:", error);
        res.status(500).json({
            status: "erro",
            error: "Erro interno ao processar a cobrança.",
        });
    }
}
