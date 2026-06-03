"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import close from "@/public/close.png";
import { Modal } from "@/ui/modal/modal";
import { StatusBadge } from "@/ui/status-badge/status-badge";

function ModalOrderQualityDetails({
  modalWorkOrderDetail,
  openJobDetail,
  selectedOrderQuantity,
  acceptOrder,
  rejectOrder,
}: {
  orderQualityDetail: any;
  modalWorkOrderDetail: boolean;
  openJobDetail: () => void;
  selectedOrderQuantity: any;
  acceptOrder: (observations?: string, measure?: number) => Promise<any>;
  rejectOrder: (observations?: string, measure?: number) => Promise<any>;
  user?: any;
}) {
  const [measureValue, setMeasureValue] = useState<number>(selectedOrderQuantity?.measure || 0);
  const [observations, setObservations] = useState<string>(selectedOrderQuantity?.additional_note || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalInstructionsOpen, setModalInstructionsOpen] = useState(false);
  const isQualityClosed = ["pass", "fail"].includes(selectedOrderQuantity?.quality_state);
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
    setMeasureValue(selectedOrderQuantity?.measure || 0);
    setObservations(selectedOrderQuantity?.additional_note || "");
  }, [selectedOrderQuantity?.id, selectedOrderQuantity?.measure, selectedOrderQuantity?.additional_note]);

  const onExecuteQualityAction = async (action: "accept" | "reject") => {
    if (isQualityClosed) return;

    setIsSubmitting(true);
    const response = action === "accept" ? await acceptOrder(observations, measureValue) : await rejectOrder(observations, measureValue);

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
            <div className="font-bold text-center">Orden de produccion</div>
            <div className="bg-whiteInput min-h-12 shadow-md p-2 rounded-md text-center break-words overflow-hidden">
              {selectedOrderQuantity?.production_id?.[1] || "N/A"}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div>
              <div className="font-bold text-center">Punto de control</div>
              <div className="bg-whiteInput min-h-12 shadow-md p-2 rounded-md text-center break-words overflow-hidden">
                {qualityPointLabel}
              </div>
            </div>

            <div>
              <div className="font-bold text-center">Estado</div>
              <div className="bg-whiteInput min-h-12 shadow-md p-2 rounded-md text-center">
                <StatusBadge status={selectedOrderQuantity?.quality_state} />
              </div>
            </div>

            <div>
              <div className="font-bold text-center">Centro de trabajo</div>
              <div className="bg-whiteInput min-h-12 shadow-md p-2 rounded-md text-center break-words overflow-hidden">
                {selectedOrderQuantity?.workcenter_id?.[1] || "N/A"}
              </div>
            </div>

            <div>
              <div className="font-bold text-center">Orden de trabajo</div>
              <div className="bg-whiteInput min-h-12 shadow-md p-2 rounded-md text-center break-words overflow-hidden">
                {workOrderLabel}
              </div>
            </div>

            <div>
              <div className="font-bold text-center">Medida</div>
              <input
                type="number"
                min="0"
                value={measureValue}
                onChange={(event) => setMeasureValue(parseInt(event.target.value) || 0)}
                className="bg-whiteInput min-h-12 w-full shadow-md rounded-md text-center focus:outline-none text-gray-900"
                placeholder="0"
                disabled={isQualityClosed}
              />
            </div>
          </div>

          <div className="mt-3">
            <div className="font-bold text-center">Observaciones</div>
            <div className="bg-whiteInput h-[12vh] shadow-md p-2 rounded-md text-center">
              <textarea
                className="h-[10vh] w-full p-2 border focus:border-primary rounded-md"
                placeholder="Escribe tus notas aqui..."
                value={observations}
                onChange={(event) => setObservations(event.target.value)}
                disabled={isQualityClosed}
              />
            </div>
          </div>
        </div>

        <div className="min-w-[150px]">
          <button
            disabled={isSubmitting || isQualityClosed}
            onClick={() => onExecuteQualityAction("accept")}
            className="font-bold bg-[#2FD28E] p-3 rounded-md w-full disabled:opacity-50"
          >
            Aprueba
          </button>
          <button
            disabled={isSubmitting || isQualityClosed}
            onClick={() => onExecuteQualityAction("reject")}
            className="font-bold bg-red-500 p-3 rounded-md w-full mt-2 disabled:opacity-50"
          >
            Falla
          </button>
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
        <div className="text-gray-900">
          <div className="mb-3 font-bold">{qualityPointLabel}</div>
          {selectedOrderQuantity?.note ? (
            <div
              className="max-h-[55vh] overflow-y-auto rounded bg-whiteInput p-4 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: selectedOrderQuantity.note }}
            />
          ) : (
            <div className="rounded bg-whiteInput p-4 text-sm">No hay instrucciones registradas.</div>
          )}
        </div>
      </Modal>
    </Modal>
  );
}

export default ModalOrderQualityDetails;
