import type { Request, Response } from "express";
import { criarReserva } from "./reservas";

export type CriarCobrancaPayload = {
  nome: string;
  email: string;
  valor: number;
  cpf: string;
  telefone: string;
  atividade: string;
  data: string; // "YYYY-MM-DD"
  participantes: number;
  horario: string;
  billingType: "CREDIT_CARD" | "PIX";
};

export type CriarCobrancaResponse = {
  status: string;
  cobranca?: {
    id: string;
    status: string;
    invoiceUrl?: string;
    pixKey?: string; // Chave PIX
    qrCodeImage?: string; // Imagem do QR Code em Base64
    expirationDate?: string; // Data de expiração do QR Code
  };
  error?: any;
};

export async function criarCobrancaHandler(req: Request, res: Response): Promise<void> {
  const {
    nome,
    email,
    valor,
    cpf,
    telefone,
    atividade,
    data,
    participantes,
    horario,
    billingType,
  } = req.body as CriarCobrancaPayload;

  // ✅ Validação básica
  if (
    !nome ||
    !email ||
    !valor ||
    !cpf ||
    !telefone ||
    !atividade ||
    !data ||
    !participantes ||
    !billingType
  ) {
    res.status(400).json({
      status: "erro",
      error: "Dados incompletos. Todos os campos são obrigatórios.",
    });
    return;
  }

  try {
    // 🔹 1. Criar a reserva no Firebase
    const reservaId = await criarReserva({
      nome,
      cpf,
      email,
      telefone,
      atividade,
      valor,
      data,
      participantes,
      horario,
      status: "aguardando",
    });

    // 🔹 3. Criar a cobrança no Asaas
    const dataHoje = new Date().toISOString().split("T")[0]; // formato YYYY-MM-DD

    const response = await fetch("https://api.asaas.com/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        access_token: process.env.ASAAS_API_KEY!,
      },
      body: JSON.stringify({
        billingType,
        customer: "cus_000125881683", // ID do cliente (mock/fixo)
        value: valor,
        dueDate: dataHoje,
        description: `Cobrança de ${nome}`,
        externalReference: reservaId,
      }),
    });

    const cobrancaData = await response.json();

    if (!response.ok) {
      console.error("Erro ao criar cobrança:", cobrancaData);
      res.status(400).json({ status: "erro", erro: cobrancaData });
      return;
    }

    // 🔹 4. Obter o QR Code se a cobrança for via PIX
    let qrCodeData = null;
    if (billingType === "PIX") {
      const qrCodeResponse = await fetch(`https://api.asaas.com/v3/payments/${cobrancaData.id}/pixQrCode`, {
        method: "GET",
        headers: {
          accept: "application/json",
          access_token: process.env.ASAAS_API_KEY!,
        },
      });

      qrCodeData = await qrCodeResponse.json();

      if (!qrCodeResponse.ok) {
        console.error("Erro ao obter QR Code:", qrCodeData);
        res.status(400).json({ status: "erro", erro: qrCodeData });
        return;
      }
    }

    // 🔹 5. Retornar a resposta da cobrança
    res.status(200).json({
      status: "ok",
      cobranca: {
        id: cobrancaData.id,
        status: cobrancaData.status,
        invoiceUrl: cobrancaData.invoiceUrl,
        pixKey: qrCodeData?.payload, // Chave PIX
        qrCodeImage: qrCodeData?.encodedImage, // Imagem do QR Code em Base64
        expirationDate: qrCodeData?.expirationDate, // Data de expiração do QR Code
      },
    });
  } catch (error) {
    console.error("Erro ao criar cobrança:", error);
    res.status(500).json({
      status: "erro",
      error: "Erro interno ao processar a cobrança.",
    });
  }
}
