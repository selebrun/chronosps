"use client";
import { Modal } from "@/ui/modal/modal";
import Image from "next/image";
import close from "@/public/close.png";
import { StatusBadge } from "@/ui/status-badge/status-badge";

function ModalOrderQualityDetails({
  orderQualityDetail,
  modalWorkOrderDetail,
  openJobDetail,
  selectedOrderQuantity,
  acceptOrder

}: {
  orderQualityDetail: any;
  modalWorkOrderDetail: boolean;
  openJobDetail: () => void;
  selectedOrderQuantity: any
  acceptOrder: () => void;
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


  return (
    <Modal
    setOpen={modalWorkOrderDetail}
    title={labels.originalTitle}
    className="max-w-3xl"
  >
    <div className="flex justify-end relative bottom-10">
      <button type="button" onClick={openJobDetail}>
        <Image src={close} alt="Close" />
      </button>
    </div>
    <div className='flex justify-between'>
      <div className='w-[55vh]'>
        <div className='mb-3 w-90'>
          <div className='font-bold text-center'>{labels.orderProductionLabel}</div>
          <div className='bg-whiteInput h-10 shadow-md p-2 rounded-md text-center'>{selectedOrderQuantity?.production_id[1]}</div>
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className=''>
            <div className='font-bold text-center'>{labels.qualityControlLabel}</div>
            <div className='bg-whiteInput h-10 shadow-md p-2 rounded-md text-center'>{selectedOrderQuantity?.name}</div>
          </div>
          <div className=''>
            <div className='font-bold text-center'>{labels.workCenterLabel}</div>
            <div className='bg-whiteInput h-10 shadow-md p-2 rounded-md text-center'>{}</div>
          </div>
          <div className=''>
            <div className='font-bold text-center'>{labels.workOrderLabel}</div>
            <div className='bg-whiteInput h-10 shadow-md p-2 rounded-md text-center'>{selectedOrderQuantity?.workorder_id}</div>
          </div>
          <div className=''>
            <div className='font-bold text-center'>{labels.mesureLabel}</div>
            <div className='flex'>
              <input type="number"min="0" className='bg-whiteInput h-10 w-full shadow-md rounded-md text-center focus:outline-none' placeholder="Medida"/>
            </div>
          </div>
        </div>
        <div className='mt-3 w-90'>
          <div className='font-bold text-center'>{labels.notesLabel}</div>
          <div className='bg-whiteInput h-[12vh] shadow-md p-2 rounded-md text-center'>
          <textarea
            className="h-[10vh] w-full p-2 border focus:border-primary rounded-md"
            placeholder="Escribe tus notas aquí..."
          />
          </div>
        </div>
      </div>
      <div className='mb-3'>
        <button className='font-bold bg-[#2FD28E] p-3 rounded-md w-full'>{labels.aproveLabel}</button>
        <button className='font-bold bg-red-500 p-3 rounded-md w-full mt-2'>{labels.declineLabel}</button>
      </div>
    </div>
  </Modal>
  );
}

export default ModalOrderQualityDetails;