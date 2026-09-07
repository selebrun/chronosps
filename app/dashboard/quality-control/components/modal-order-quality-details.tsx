"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import close from "@/public/close.png";
import { Modal } from "@/ui/modal/modal";
import { StatusBadge } from "@/ui/status-badge/status-badge";

function normalizeQualityNote(value: any) {
  if (value === null || value === undefined || value === false) return "";

  return String(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n")
    .replace(/<\/?p[^>]*>/gi, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function ModalOrderQualityDetails({
  modalWorkOrderDetail,
  openJobDetail,
  selectedOrderQuantity,
  acceptOrder,
  rejectOrder,
  saveNotes,
  user,
}: {
  orderQualityDetail: any;
  modalWorkOrderDetail: boolean;
  openJobDetail: () => void;
  selectedOrderQuantity: any;
  acceptOrder: (observations?: string) => Promise<any>;
  rejectOrder: (observations?: string) => Promise<any>;
  saveNotes: (observations?: string) => Promise<any>;
  user?: any;
}) {
  const [observations, setObservations] = useState<string>(normalizeQualityNote(selectedOrderQuantity?.additional_note));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [modalInstructionsOpen, setModalInstructionsOpen] = useState(false);
  const isQualityApproved = selectedOrderQuantity?.quality_state === "pass";
  const isQualityFailed = selectedOrderQuantity?.quality_state === "fail";
  const normalizedRole = String(user?.role || "").trim();
  const canManageQuality = ["Calidad", "Lider", "Jefe"].includes(normalizedRole);
  const canResolveFailedQuality = canManageQuality;
  const isQualityRequested = selectedOrderQuantity?.quality_requested !== false;
  const isWorkOrderStarted = selectedOrderQuantity?.workorder_started === true || isQualityApproved || isQualityFailed;
  const canAcceptQuality = canManageQuality && isWorkOrderStarted && isQualityRequested && !isSubmitting && !isQualityApproved && (!isQualityFailed || canResolveFailedQuality);
  const canRejectQuality = canManageQuality && isWorkOrderStarted && isQualityRequested && !isSubmitting && !isQualityApproved && !isQualityFailed;
  const rawWorkOrderName = selectedOrderQuantity?.workorder_name || (Array.isArray(selectedOrderQuantity?.workorder_id)
    ? selectedOrderQuantity.workorder_id[1]
    : selectedOrderQuantity?.workorder_id || "");
  const operationName = rawWorkOrderName.includes(" - ") ? rawWorkOrderName.split(" - ").slice(1).join(" - ") : rawWorkOrderName;
  const workOrderLabel = selectedOrderQuantity?.workorder_sequence !== null && selectedOrderQuantity?.workorder_sequence !== undefined
    ? operationName ? `${selectedOrderQuantity.workorder_sequence} - ${operationName}` : selectedOrderQuantity.workorder_sequence
    : operationName || "N/A";
  const qualityPointLabel = Array.isArray(selectedOrderQuantity?.point_id)
    ? `${selectedOrderQuantity?.name || ""} - ${selectedOrderQuantity.point_id[1]}`
    : selectedOrderQuantity?.name || "N/A";

  useEffect(() => {
    setObservations(normalizeQualityNote(selectedOrderQuantity?.additional_note));
    setSaveMessage("");
  }, [selectedOrderQuantity?.id, selectedOrderQuantity?.additional_note]);

  const onSaveNotes = async () => {
    setIsSubmitting(true);
    setSaveMessage("");
    const response = await saveNotes(observations);
    setSaveMessage(response?.message || (response?.status ? "Notas guardadas." : "No se pudieron guardar las notas."));
    setIsSubmitting(false);
  };

  const onExecuteQualityAction = async (action: "accept" | "reject") => {
    if (action === "accept" && !canAcceptQuality) return;
    if (action === "reject" && !canRejectQuality) return;

    setIsSubmitting(true);
    const response = action === "accept" ? await acceptOrder(observations) : await rejectOrder(observations);

    if (response?.status) {
      openJobDetail();
    }

    setIsSubmitting(false);
  };

  return (
    <Modal
      setOpen={modalWorkOrderDetail}
      title="Detalles de calidad"
      className="max-w-3xl"
    >
      <div className="flex justify-end relative bottom-10">
        <button type="button" onClick={openJobDetail}>
          <Image src={close} alt="Close" />
        </button>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
        <div className="w-full">
          <div className="mb-3">
            <div className="font-bold text-center dark:text-gray-100">Orden de produccion</div>
            <div className="bg-whiteInput dark:bg-gray-700 dark:text-gray-100 min-h-12 shadow-md p-2 rounded-md text-center break-words overflow-hidden">
              {selectedOrderQuantity?.production_id?.[1] || "N/A"}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div>
              <div className="font-bold text-center dark:text-gray-100">Punto de control</div>
              <div className="bg-whiteInput dark:bg-gray-700 dark:text-gray-100 min-h-12 shadow-md p-2 rounded-md text-center break-words overflow-hidden">
                {qualityPointLabel}
              </div>
            </div>

            <div>
              <div className="font-bold text-center dark:text-gray-100">Estado</div>
              <div className="bg-whiteInput dark:bg-gray-700 dark:text-gray-100 min-h-12 shadow-md p-2 rounded-md text-center">
                <StatusBadge status={selectedOrderQuantity?.quality_state} />
              </div>
            </div>

            <div>
              <div className="font-bold text-center dark:text-gray-100">Centro de trabajo</div>
              <div className="bg-whiteInput dark:bg-gray-700 dark:text-gray-100 min-h-12 shadow-md p-2 rounded-md text-center break-words overflow-hidden">
                {selectedOrderQuantity?.workcenter_id?.[1] || "N/A"}
              </div>
            </div>

            <div>
              <div className="font-bold text-center dark:text-gray-100">Orden de trabajo</div>
              <div className="bg-whiteInput dark:bg-gray-700 dark:text-gray-100 min-h-12 shadow-md p-2 rounded-md text-center break-words overflow-hidden">
                {workOrderLabel}
              </div>
            </div>
          </div>

          <div className="mt-3">
            <div className="font-bold text-center dark:text-gray-100">Observaciones</div>
            <div className="bg-whiteInput dark:bg-gray-700 h-[12vh] shadow-md p-2 rounded-md text-center">
              <textarea
                className="h-[10vh] w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100 focus:border-primary rounded-md"
                placeholder="Escribe tus notas aqui..."
                value={observations}
                onChange={(event) => setObservations(event.target.value)}
              />
            </div>
            <button
              disabled={isSubmitting}
              onClick={onSaveNotes}
              className="mt-3 font-bold bg-[#A9D1DC] p-3 rounded-md w-full disabled:opacity-50"
            >
              {isSubmitting ? "Guardando..." : "Guardar comentarios"}
            </button>
          </div>
          {saveMessage && (
            <div className="mt-3 rounded-md bg-[#A9D1DC] p-2 text-center font-medium text-gray-900">
              {saveMessage}
            </div>
          )}
        </div>

        <div className="min-w-[150px]">
          {!isQualityApproved && !isQualityFailed && !isWorkOrderStarted && (
            <div className="rounded-md bg-amber-100 p-3 text-center font-bold text-amber-900">
              La OT aun no ha sido iniciada
            </div>
          )}
          {!isQualityApproved && !isQualityFailed && isWorkOrderStarted && !isQualityRequested && (
            <div className="rounded-md bg-amber-100 p-3 text-center font-bold text-amber-900">
              Pendiente de convocatoria
            </div>
          )}
          {isQualityApproved && (
            <div className="rounded-md bg-green-100 p-3 text-center font-bold text-green-800">
              Control aprobado
            </div>
          )}
          {isQualityFailed && canResolveFailedQuality && (
            <button
              disabled={!canAcceptQuality}
              onClick={() => onExecuteQualityAction("accept")}
              className="font-bold bg-[#2FD28E] p-3 rounded-md w-full disabled:opacity-50"
            >
              Aprobar correccion
            </button>
          )}
          {isQualityFailed && !canResolveFailedQuality && (
            <div className="rounded-md bg-red-100 p-3 text-center font-bold text-red-800">
              Control fallido
            </div>
          )}
          {!isQualityApproved && !isQualityFailed && (
            <>
              <button
                disabled={!canAcceptQuality}
                onClick={() => onExecuteQualityAction("accept")}
                className="font-bold bg-[#2FD28E] p-3 rounded-md w-full disabled:opacity-50"
              >
                Aprueba
              </button>
              <button
                disabled={!canRejectQuality}
                onClick={() => onExecuteQualityAction("reject")}
                className="font-bold bg-red-500 p-3 rounded-md w-full mt-2 disabled:opacity-50"
              >
                Falla
              </button>
            </>
          )}
          <button
            disabled={!selectedOrderQuantity?.note}
            onClick={() => setModalInstructionsOpen(true)}
            className="font-bold bg-[#1D4C92] text-white p-3 rounded-md w-full mt-2 disabled:opacity-50"
          >
            Instrucciones
          </button>
        </div>
      </div>

      <Modal setOpen={modalInstructionsOpen} title="Instrucciones" className="max-w-2xl">
        <div className="flex justify-end relative bottom-10">
          <button
            type="button"
            onClick={() => setModalInstructionsOpen(false)}
          >
            <Image src={close} alt="Close" />
          </button>
        </div>
        <div className="text-gray-900 dark:text-gray-100">
          <div className="mb-3 font-bold dark:text-gray-100">{qualityPointLabel}</div>
          {selectedOrderQuantity?.note ? (
            <div
              className="max-h-[55vh] overflow-y-auto rounded bg-whiteInput dark:bg-gray-700 dark:text-gray-100 p-4 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: selectedOrderQuantity.note }}
            />
          ) : (
            <div className="rounded bg-whiteInput dark:bg-gray-700 dark:text-gray-100 p-4 text-sm">No hay instrucciones registradas.</div>
          )}
        </div>
      </Modal>
    </Modal>
  );
}

export default ModalOrderQualityDetails;
