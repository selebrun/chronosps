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
  
  return (
    <Modal
      setOpen={modalWorkOrderDetail}
      title={"Detalles de calidad"}
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
              <div className="font-bold text-center">Control de calidad</div>
              <div className="bg-whiteInput shadow-md p-2 rounded-md text-center">
                {selectedOrderQuantity?.name}
              </div>
            </div>
            <div className="">
              <div className="font-bold text-center">
                Orden de producción
              </div>
              <div className="bg-whiteInput shadow-md p-2 rounded-md text-center">
              {selectedOrderQuantity?.production_id[1]}
              </div>
            </div>
            <div className="">
              <div className="bg-[#2FD28E] shadow-md p-2 mt-6 rounded-md text-center text-color-black font-bold">
              <button
                onClick={() => acceptOrder()}
                className="font-bold text-color-black focus:outline-none transition duration-300 ease-in-out transform hover:bg-[#228D6D]"
                >Aprobar
                </button>
              </div>
            </div>
            <div className="">
              <div className="font-bold text-center">Centro de trabajo</div>
              <div className="bg-whiteInput shadow-md p-2 rounded-md h-10 text-center">
              ººº
              </div>
            </div>
            <div className="">
              <div className="font-bold text-center">Orden de trabajo</div>
              <div className="overflow-x-auto bg-whiteInput shadow-md p-2 rounded-md text-center whitespace-nowrap">
                {selectedOrderQuantity?.workorder_id}
              </div>
            </div>
            <div className="">
              <div className="bg-red-500 shadow-md p-2 mt-6 rounded-md text-center text-color-black font-bold">
              <button
                className="font-bold text-color-black focus:outline-none"
                >Declinar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex mt-2 ">
        <div className="">
          <div className="font-bold text-center">Medidas</div>
          <div className="w-[40vh] mr-5 bg-whiteInput shadow-md p-2 rounded-md text-center">
          <input
            type="number"
            className="w-full p-2 border-none focus:outline-none"
            placeholder="Ingrese la medida"
            min="0"
          />
          </div>
        </div>

        <div className="">
          <div className="font-bold text-center">Notas</div>
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
