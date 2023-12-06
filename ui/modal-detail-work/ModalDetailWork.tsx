"use client"
import { useState } from 'react'
import { Modal } from "@/ui/modal/modal"
import Image from 'next/image'
import close from '@/public/close.png'
import { StatusBadge } from '@/ui/status-badge/status-badge'


export function ModalDetailWork({ 
  modalIsOpenJobDetail, 
  showDetailOrderWork, 
  orderProductionSelected, 
  progress, 
  setModalIsOpenJobDetail,
  modalIsOpenInstructions, 
  openModalInstructions,
  executeWorkOrderAction,
  loadigAction,
}: {
  modalIsOpenJobDetail: boolean
  showDetailOrderWork?: any 
  orderProductionSelected?: any 
  progress?: number
  setModalIsOpenJobDetail: any
  modalIsOpenInstructions: boolean
  openModalInstructions: () => void
  executeWorkOrderAction: (action:string) => void
  loadigAction: boolean
}) {

  const renderButtons = (showDetailOrderWork: any) => {
    const isBlocked = showDetailOrderWork.working_state === "blocked";
    const isUserWorking = showDetailOrderWork.is_user_working;
    const buttons = [];
  
    if (!isBlocked && !isUserWorking) {
      buttons.push(<div className="mb-3"><button onClick={() => executeWorkOrderAction('start_work_order')} key="start" className='font-bold bg-[#2FD28E] p-3 rounded-md w-full'>Inicio</button></div>)
    }
  
    if (!isBlocked) {
      buttons.push(<div className="mb-3"><button onClick={() => executeWorkOrderAction('block_work_order')} key="block" className='font-bold bg-red-500 p-3 rounded-md w-full'>Bloquear</button></div>)
    } else {
      buttons.push(<div className="mb-3"><button key="unblock" onClick={() => executeWorkOrderAction('unblock_work_order')} className='font-bold bg-red-500 p-3 rounded-md w-full'>Desbloquear</button></div>)
    }
  
    if (!isBlocked && isUserWorking) {
      buttons.push(<div className="mb-3"><button key="stop" onClick={() => executeWorkOrderAction('stop_work_order')} className='font-bold bg-[#2FD28E] p-3 rounded-md w-full'>Detener</button></div>)
      buttons.push(<div className="mb-3"><button key="done" onClick={() => executeWorkOrderAction('finish_work_order')} className='font-bold bg-[#2FD28E] p-3 rounded-md w-full'>Hecho</button></div>)
    }
  
    buttons.push(<div className="mb-3"><button onClick={() => openModalInstructions()} key="instructions" className='font-bold bg-[#A9D1DC] p-3 rounded-md w-full'>Instrucciones</button></div>);
    buttons.push(<div className="mb-3"><button key="materials" className='font-bold bg-[#1D4C92] text-white p-3 rounded-md w-full'>Materiales</button></div>)
  
    return <>{buttons}</>
  }
  

  return (
    <>
      <Modal setOpen={modalIsOpenInstructions} title='Instrucciones' className='max-w-3xl'>
        <div className="flex justify-end relative bottom-10">
          <button
            type="button"
            onClick={() => openModalInstructions()}
          >
            <Image
              src={close}
              alt="Close"
            />
          </button>
        </div>
        {showDetailOrderWork?.operation_note &&
        <div dangerouslySetInnerHTML={{ __html: showDetailOrderWork?.operation_note }} />}
        {!showDetailOrderWork.operation_note && 
        <div className="font-bold text-center" >No posee instrucciones</div>}
      </Modal>
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
          {loadigAction &&
            <div className="rounded-md absolute p-7 top-[50%] left-[50%] transform translate-x-[-50%] translate-y-[-50%] bg-white shadow-[0_35px_60px_-15px_rgba(0.7,0,0,0.7)]">                
              <svg aria-hidden="true" className="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-gray-600 dark:fill-gray-300" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
              </svg>
                <span className="ml-2">Procesando ...</span>
            </div>}
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
       {/* <Modal setOpen={true} title='Motivo del bloqueo' className='max-w-xs'>
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
          <div>
            <div>Seleccione un motivo de bloqueo</div>
            <select className="w-full " placeholder='Seleccionar motivo'>

            </select>
          </div>
            
      </Modal> */}
    </>
  )
}
