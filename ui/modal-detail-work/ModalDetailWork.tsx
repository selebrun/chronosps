"use client"
import { Modal } from "@/ui/modal/modal"
import Image from 'next/image'
import close from '@/public/close.png'
import { StatusBadge } from '@/ui/status-badge/status-badge'


export function ModalDetailWork({ modalIsOpenJobDetail, showDetailOrderWork, orderProductionSelected, progress, setModalIsOpenJobDetail }: {
  modalIsOpenJobDetail: boolean
  showDetailOrderWork?: any 
  orderProductionSelected?: any 
  progress?: number
  setModalIsOpenJobDetail: any
}) {

  const renderButtons = (showDetailOrderWork: any) => {
    const isBlocked = showDetailOrderWork.working_state === "blocked";
    const isUserWorking = showDetailOrderWork.is_user_working;
    const buttons = [];
  
    if (!isBlocked && !isUserWorking) {
      buttons.push(<div className="mb-3"><button key="start" className='font-bold bg-[#2FD28E] p-3 rounded-md w-full'>Inicio</button></div>)
    }
  
    if (!isBlocked) {
      buttons.push(<div className="mb-3"><button key="block" className='font-bold bg-red-500 p-3 rounded-md w-full'>Bloquear</button></div>)
    } else {
      buttons.push(<div className="mb-3"><button key="unblock" className='font-bold bg-red-500 p-3 rounded-md w-full'>Desbloquear</button></div>)
    }
  
    if (!isBlocked && isUserWorking) {
      buttons.push(<div className="mb-3"><button key="stop" className='font-bold bg-[#2FD28E] p-3 rounded-md w-full'>Detener</button></div>)
      buttons.push(<div className="mb-3"><button key="done" className='font-bold bg-[#2FD28E] p-3 rounded-md w-full'>Hecho</button></div>)
    }
  
    buttons.push(<div className="mb-3"><button key="instructions" className='font-bold bg-[#A9D1DC] p-3 rounded-md w-full'>Instrucciones</button></div>);
    buttons.push(<div className="mb-3"><button key="materials" className='font-bold bg-[#1D4C92] p-3 rounded-md w-full'>Materiales</button></div>)
  
    return <>{buttons}</>
  }
  

  return (
    <Modal setOpen={modalIsOpenJobDetail} title='Detalle de Trabajo' className='max-w-3xl'>
      <div className="flex justify-end relative bottom-10">
        <button
          type="button"
          onClick={() => setModalIsOpenJobDetail(false)}
        >
          <Image
            src={close}
            alt="Close"
          />
        </button>
      </div>
      <div className='flex justify-between'>
          <div className='w-[80vh]'>
              <div className='mb-3 w-90'>
                  <div className='font-bold text-center'>Nombre de la Orden</div>
                  <div className='bg-whiteInput shadow-md p-2 rounded-md text-center'>{showDetailOrderWork?.name}</div>
              </div>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <div className=''>
                      <div className='font-bold text-center'>Inicio proramado</div>
                      <div className='bg-whiteInput shadow-md p-2 rounded-md text-center'>{showDetailOrderWork?.date_planned_start ? showDetailOrderWork.date_planned_start : 'No definida'}</div>
                  </div>
                <div className=''>
                    <div className='font-bold text-center'>Final Programado</div>
                    <div className='bg-whiteInput shadow-md p-2 rounded-md text-center'>{showDetailOrderWork?.date_planned_finished ? showDetailOrderWork.date_planned_finished : 'No definida'}</div>
                </div>
                <div className=''>
                    <div className='font-bold text-center'>Duración teorica</div>
                    <div className='bg-whiteInput shadow-md p-2 rounded-md text-center'>{showDetailOrderWork?.theoretical_duration}</div>
                </div>
                <div className=''>
                    <div className='font-bold text-center'>Duración real</div>
                    <div className='bg-whiteInput shadow-md p-2 rounded-md h-10 text-center'>{showDetailOrderWork?.real_duration}</div>
                </div>
                <div className=''>
                    <div className='font-bold text-center'>Centro de trabajo</div>
                    <div className='bg-whiteInput shadow-md p-2 rounded-md text-center'>{showDetailOrderWork?.workcenter_id[1]}</div>
                </div>
                <div className=''>
                    <div className='font-bold text-center'>Cantidad</div>
                    <div className='bg-whiteInput shadow-md p-2 rounded-md text-center'>{orderProductionSelected?.product_qty}</div>
                </div>
              </div>
          </div>
          <div className='ml-10'>
            {renderButtons(showDetailOrderWork)}
          </div>
      </div>
        <div className='flex mt-5 '>
          <div className='w-[50vh] mr-5 bg-whiteInput shadow-md p-2 rounded-md text-center'><StatusBadge status={showDetailOrderWork.state} /></div>
          <div className='w-[50vh] mr-5 bg-whiteInput shadow-md p-2 rounded-md text-center'>{progress}%</div>
      </div>
    </Modal>
  )
}
