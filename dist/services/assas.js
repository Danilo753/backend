"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.criarCobrancaHandler = criarCobrancaHandler;
const reservas_1 = require("./reservas");
async function criarCobrancaHandler(req, res) {
    const { nome, email, valor, cpf, telefone, atividade, data, participantes, billingType, } = req.body;
    // ✅ Validação básica
    if (!nome ||
        !email ||
        !valor ||
        !cpf ||
        !telefone ||
        !atividade ||
        !data ||
        !participantes ||
        !billingType) {
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
        // 🔹 2. Montar o split dinâmico
        const WALLET_ID = "52018a77-869b-4df9-aae7-82f5d604c7f4";
        let split = [];
        if (billingType === "PIX") {
            const valorParaSecundaria = valor - 1.0;
            split = [
                {
                    walletId: WALLET_ID,
                    fixedValue: parseFloat(valorParaSecundaria.toFixed(2)),
                },
            ];
        }
        else if (billingType === "CREDIT_CARD") {
            const percentualParaPrincipal = 1.0; // 1%
            const valorParaPrincipal = valor * (percentualParaPrincipal / 100);
            const valorParaSecundaria = valor - valorParaPrincipal;
            split = [
                {
                    walletId: WALLET_ID,
                    fixedValue: parseFloat(valorParaSecundaria.toFixed(2)),
                },
            ];
        }
        // 🔹 3. Criar a cobrança no Asaas
        const dataHoje = new Date().toISOString().split("T")[0]; // formato YYYY-MM-DD
        const response = await fetch("https://api.asaas.com/v3/payments", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                accept: "application/json",
                access_token: process.env.ASAAS_API_KEY,
            },
            body: JSON.stringify({
                billingType,
                customer: "cus_000125717290", // ID do cliente (mock/fixo)
                value: valor,
                dueDate: dataHoje,
                description: `Cobrança de ${nome}`,
                externalReference: reservaId,
                split,
            }),
        });
        const cobrancaData = await response.json();
        if (!response.ok) {
            console.error("Erro ao criar cobrança:", cobrancaData);
            res.status(400).json({ status: "erro", erro: cobrancaData });
            return;
        }
        // 🔹 4. Retornar a resposta da cobrança
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
