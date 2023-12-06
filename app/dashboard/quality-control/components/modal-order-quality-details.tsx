"use client";
import { Modal } from "@/ui/modal/modal";
import Image from "next/image";
import close from "@/public/close.png";
import { StatusBadge } from "@/ui/status-badge/status-badge";

function ModalOrderQualityDetails({
  orderQualityDetail,
  modalWorkOrderDetail,
  openJobDetail,
  selectedOrderQuantity

}: {
  orderQualityDetail: any;
  modalWorkOrderDetail: boolean;
  openJobDetail: () => void;
  selectedOrderQuantity: any
}) {
  
  const labels = {
    originalTitle: "Detalles de calidad",
    qualityControlLabel: "Control de calidad",
    orderProductionLabel: "Orden de producción",
    aproveLabel: "Aprobar",
    declineLabel: "Declinar",
    workCenterLabel: "Centro de trabajo",
    workOrderLabel: "Orden de trabajo",
    mesureLabel: "Medida",
    notesLabel: "Notas",
    instructionsLabel: "Instrucciones",
  };
  const upperCaseLabels = Object.fromEntries(
    Object.entries(labels).map(([key, value]) => [key, value.toUpperCase()])
  );
  const {
    originalTitle,
    qualityControlLabel,
    orderProductionLabel,
    aproveLabel,
    declineLabel,
    workCenterLabel,
    workOrderLabel,
    mesureLabel,
    notesLabel,
    instructionsLabel,
  } = upperCaseLabels;

  return (
    <Modal
      setOpen={modalWorkOrderDetail}
      title={originalTitle}
      className="max-w-3xl"
    >
      <div className="flex justify-end relative bottom-10">
        <button type="button" onClick={openJobDetail}>
          <Image src={close} alt="Close" />
        </button>
      </div>

      <div className="flex justify-between">
        <div className="w-[80vh]">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="">
              <div className="font-bold text-center">{qualityControlLabel}</div>
              <div className="bg-whiteInput shadow-md p-2 rounded-md text-center">
                {selectedOrderQuantity?.name}
              </div>
            </div>
            <div className="">
              <div className="font-bold text-center">
                {orderProductionLabel}
              </div>
              <div className="bg-whiteInput shadow-md p-2 rounded-md text-center">
              {selectedOrderQuantity?.production_id[1]}
              </div>
            </div>
            <div className="">
              <div className="bg-[#2FD28E] shadow-md p-2 mt-6 rounded-md text-center text-color-black font-bold">
              <button
                className="font-bold text-color-black focus:outline-none transition duration-300 ease-in-out transform hover:bg-[#228D6D]"
                
                >{aproveLabel}
                </button>
              </div>
            </div>
            <div className="">
              <div className="font-bold text-center">{workCenterLabel}</div>
              <div className="bg-whiteInput shadow-md p-2 rounded-md h-10 text-center">
              ººº
              </div>
            </div>
            <div className="">
              <div className="font-bold text-center">{workOrderLabel}</div>
              <div className="overflow-x-auto bg-whiteInput shadow-md p-2 rounded-md text-center whitespace-nowrap">
                {selectedOrderQuantity?.workorder_id}
              </div>
            </div>
            <div className="">
              <div className="bg-red-500 shadow-md p-2 mt-6 rounded-md text-center text-color-black font-bold">
              <button
                className="font-bold text-color-black focus:outline-none"
                >{declineLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex mt-2 ">
        <div className="">
          <div className="font-bold text-center">{mesureLabel}</div>
          <div className="w-[40vh] mr-5 bg-whiteInput shadow-md p-2 rounded-md text-center">
          <input
            type="number"
            className="w-full p-2 border-none focus:outline-none"
            placeholder="Ingrese la medida"
            min="0"
          />
          </div>
          <div className="font-bold text-center p-2">{instructionsLabel}</div>
          <div className="h-[10vh] mr-5 bg-whiteInput shadow-md p-2 rounded-md text-center">
            ººº
          </div>
        </div>

        <div className="">
          <div className="font-bold text-center">{notesLabel}</div>
          <div className="h-[15vh] w-[36vh] mr-3 bg-whiteInput shadow-md pb-12 rounded-md text-center">
            <textarea
              className="h-[15vh] w-full p-2 border focus:border-primary rounded-md"
              placeholder="Escribe tus notas aquí..."
            />
          </div>
        </div>
      </div>
      
    </Modal>
  );
}

export default ModalOrderQualityDetails;
