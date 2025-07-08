import { db } from "./firebase";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

export type CriarReservaPayload = {
  nome: string;
  cpf: string;
  email: string;
  valor: number;
  telefone: string;
  atividade: string;
  data: string;
  participantes: number;
  status?: string;
  observacao?: string;
};

export async function criarReserva(payload: CriarReservaPayload): Promise<string> {
  const {
    nome,
    cpf,
    email,
    valor,
    telefone,
    atividade,
    data,
    participantes,
    status = "aguardando",
    observacao = ""
  } = payload;

  // 🔹 Gera um ID único (reservaId)
  const reservaId = uuidv4();
  const reservaRef = doc(db, "reservas", reservaId);

  // 🔹 Cria o documento com ID fixo
   await setDoc(reservaRef, {
    nome,
    cpf,
    email,
    valor,
    telefone,
    atividade,
    data,
    participantes,
    status,
    observacao,
    criadoEm: Timestamp.now(),
  });
  // 🔹 Retorna o ID gerado (será usado no externalReference do Asaas)
  return reservaId;
}
