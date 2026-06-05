"use client"
import { useEffect, useState } from 'react'
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
  modalIsOpenBlocks,
  setModalIsOpenBlocks,
  modalIsOpenCompleteOrder,
  setModalIsOpenCompleteOrder,
  blockReasons,
  modalIsMaterials,
  setModalIsMaterials,
  getMaterials,
  materials,
  setModalIsAddMaterials,
  modalIsAddMaterials,
  onAddMaterial,
  loadigSaveMaterials,
  onSaveMaterialsOrder,
  disabledBtnSaveMaterial,
  setDisabledBtnSaveMaterial,
  user,
  error,
  qualityPauseMessage,
  onCloseQualityPauseMessage
}: {
  modalIsOpenJobDetail: boolean
  showDetailOrderWork?: any 
  orderProductionSelected?: any 
  progress?: number
  setModalIsOpenJobDetail: any
  modalIsOpenInstructions: boolean
  openModalInstructions: () => void
  executeWorkOrderAction: (action:string, block_reason?: any | undefined, qtyDone?: number | undefined ) => void
  loadigAction: boolean
  modalIsOpenBlocks: boolean 
  setModalIsOpenBlocks: any
  modalIsOpenCompleteOrder: boolean
  setModalIsOpenCompleteOrder: any
  blockReasons: any
  modalIsMaterials: boolean
  setModalIsMaterials: any
  getMaterials: any
  materials: any
  setModalIsAddMaterials: any
  modalIsAddMaterials: boolean
  onAddMaterial: (material:any, total: number) => void
  loadigSaveMaterials: boolean
  onSaveMaterialsOrder: () => void
  disabledBtnSaveMaterial: boolean
  setDisabledBtnSaveMaterial: any
  user: any
  error: string
  qualityPauseMessage?: string
  onCloseQualityPauseMessage?: () => void
}) {
  const [valueSelect, setValueSelect] = useState('');
  const [qtyDone, setQtyDone] = useState<number>(orderProductionSelected?.product_qty || 0 );
  const [disabledBtnBlock, setDisabledBtnBlock] = useState(true);
  const [valueSelectMaterial, setvValueSelectMaterial] = useState('');
  const [valueTotalMaterial, setvValueTotalMaterial] = useState(0);
  const [disabledBtnAddMaterials, setDisabledBtnAddMaterials] = useState(true);
  const isTimerRunning = Boolean(showDetailOrderWork?.is_user_working && showDetailOrderWork?.working_state !== 'blocked' && !showDetailOrderWork?.state?.includes('done'));
  const baseElapsedSeconds = Math.max(0, Math.round(Number(showDetailOrderWork?.duration || 0) * 60));
  const [elapsedSeconds, setElapsedSeconds] = useState(baseElapsedSeconds);
  const expectedSeconds = Math.max(Number(showDetailOrderWork?.duration_expected || 0) * 60, 1);
  const visualProgress = Math.min(Math.floor((elapsedSeconds / expectedSeconds) * 100), 100) || progress || 0;

  useEffect(() => {
    setElapsedSeconds(baseElapsedSeconds);
  }, [showDetailOrderWork?.id, showDetailOrderWork?.duration, showDetailOrderWork?.is_user_working, showDetailOrderWork?.working_state, showDetailOrderWork?.state, baseElapsedSeconds]);

  useEffect(() => {
    if (!isTimerRunning) return;

    const timer = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isTimerRunning, showDetailOrderWork?.id]);

  const formatElapsedTime = (totalSeconds: number) => {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return [hours, minutes, remainingSeconds]
      .map((value) => value.toString().padStart(2, '0'))
      .join(':');
  }

  const formatDurationFromMinutes = (durationMinutes: any, fallback = '') => {
    const minutes = Number(durationMinutes);

    if (!Number.isFinite(minutes) || minutes <= 0) {
      return fallback || 'No definida';
    }

    return formatElapsedTime(Math.round(minutes * 60));
  }

  const theoreticalDuration = formatDurationFromMinutes(showDetailOrderWork?.duration_expected, showDetailOrderWork?.theoretical_duration);
  const realDuration = formatElapsedTime(elapsedSeconds);

  const renderButtons = (showDetailOrderWork: any) => {
    const isBlocked = showDetailOrderWork.working_state === "blocked";
    const isUserWorking = showDetailOrderWork.is_user_working;
    const isPaused = showDetailOrderWork.working_state === "paused" || (!isUserWorking && showDetailOrderWork.duration > 0);
    const buttons = [];
    const disabledBtns = showDetailOrderWork.state.includes('done')

    // Show Start button only if activity hasn't begun
    if (!isBlocked && !isUserWorking && showDetailOrderWork.duration === 0) {
      buttons.push(<div className="mb-3"><button disabled={disabledBtns} onClick={() => executeWorkOrderAction('start_work_order')} key="start" className='disabled:opacity-50 font-bold bg-[#2FD28E] p-3 rounded-md w-full'>Inicio</button></div>)
    }

    // Show Resume button if paused
    if (!isBlocked && isPaused && !isUserWorking) {
      buttons.push(<div className="mb-3"><button disabled={disabledBtns} onClick={() => executeWorkOrderAction('start_work_order')} key="resume" className='disabled:opacity-50 font-bold bg-[#2FD28E] p-3 rounded-md w-full'>Reanudar</button></div>)
    }

    // Block/Unblock buttons
    if (!isBlocked) {
      buttons.push(<div className="mb-3"><button disabled={disabledBtns} onClick={() => setModalIsOpenBlocks(true)} key="block" className='disabled:opacity-50 font-bold bg-red-500 p-3 rounded-md w-full'>Bloquear</button></div>)
    } else {
      buttons.push(<div className="mb-3"><button key="unblock" onClick={() => executeWorkOrderAction('unblock_work_order')} className='font-bold bg-red-500 p-3 rounded-md w-full'>Desbloquear</button></div>)
    }
  
    // Pause and Done buttons shown only when actively working
    if (!isBlocked && isUserWorking) {
      buttons.push(<div className="mb-3"><button key="stop" onClick={() => executeWorkOrderAction('stop_work_order')} className='font-bold bg-[#2FD28E] p-3 rounded-md w-full'>Pausar</button></div>)
      buttons.push(<div className="mb-3"><button key="done" onClick={() => setModalIsOpenCompleteOrder(true)} className='font-bold bg-[#2FD28E] p-3 rounded-md w-full'>Hecho</button></div>)
    }
  
    buttons.push(<div className="mb-3"><button onClick={() => openModalInstructions()} key="instructions" className='font-bold bg-[#A9D1DC] p-3 rounded-md w-full'>Instrucciones</button></div>);
    
    // Materials button: available to users with materiales permission (not just non-Operario)
    if (user?.materiales) {
      buttons.push(<div className="mb-3"><button disabled={disabledBtns} onClick={() => {setModalIsMaterials(true), getMaterials()}}  key="materials" className='disabled:opacity-50 font-bold bg-[#1D4C92] text-white p-3 rounded-md w-full'>Materiales</button></div>)
    }
  
    return <>{buttons}</>
  }
  

  const onChangeSelection = (e: any) => {
    if (e !== '') {
      setValueSelect(e)
      setDisabledBtnBlock(false)
    } else {
      setDisabledBtnBlock(true)
    }
  }

  const onChangeMaterial = (e: any) => {
    if (e !== '') {
      setvValueSelectMaterial(e)
      setDisabledBtnAddMaterials(false)
    } else {
      setDisabledBtnAddMaterials(true)
    }
  }

  const onChangeTotalMaterial = (e: any) => {
    setvValueTotalMaterial(e)
  }

  return (
    <>
      <Modal setOpen={Boolean(qualityPauseMessage)} title='Control de calidad pendiente' className='max-w-md'>
        <div className="text-gray-900">
          <div className="mb-5 rounded-md bg-[#A9D1DC] p-4 font-medium">
            {qualityPauseMessage}
          </div>
          <div className="text-center">
            <button
              type="button"
              onClick={onCloseQualityPauseMessage}
              className="font-bold bg-[#2FD28E] p-3 rounded-md w-full"
            >
              Aceptar
            </button>
          </div>
        </div>
      </Modal>
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
        {!showDetailOrderWork?.operation_note && 
        <div className="font-bold text-center" >No posee instrucciones</div>}
        {showDetailOrderWork?.worksheet && 
        <div ><iframe width={'100%'} height="600px"  src={`data:application/pdf;base64,${showDetailOrderWork?.worksheet}`} ></iframe></div>}
      </Modal>
      <Modal setOpen={modalIsOpenJobDetail} title='Detalle de Trabajo' className='max-w-3xl'>
          <div className="flex justify-end relative bottom-10">
            <button
              type="button"
              onClick={() => {
                setModalIsOpenJobDetail(false)
              }}
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
          {error !== '' && <div className='mb-5 font-bold bg-[#A9D1DC] p-3 rounded-md w-full'>{error}</div>}
          <div className='flex justify-between'>
              <div className='w-[80vh]'>
                  <div className='mb-3 w-90'>
                      <div className='font-bold text-center'>Nombre de la Orden</div>
                      <div className='bg-whiteInput shadow-md p-2 rounded-md text-center'>{showDetailOrderWork?.name}</div>
                  </div>
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                      <div className=''>
                          <div className='font-bold text-center'>Inicio Programado</div>
                          <div className='bg-whiteInput shadow-md p-2 rounded-md text-center'>{showDetailOrderWork?.date_start? showDetailOrderWork.date_start : 'No definida'}</div>
                      </div>
                    <div className=''>
                        <div className='font-bold text-center'>Final Programado</div>
                        <div className='bg-whiteInput shadow-md p-2 rounded-md text-center'>{showDetailOrderWork?.date_finished ? showDetailOrderWork.date_finished : 'No definida'}</div>
                    </div>
                    <div className=''>
                        <div className='font-bold text-center'>Duración teorica</div>
                        <div className='bg-whiteInput shadow-md p-2 rounded-md text-center font-mono text-lg'>{theoreticalDuration}</div>
                    </div>
                    <div className=''>
                        <div className='font-bold text-center'>Duración real</div>
                        <div className='bg-whiteInput shadow-md p-2 rounded-md h-10 text-center font-mono text-lg'>{realDuration}</div>
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
              <div className='w-[50vh] mr-5'>
                <div className='bg-whiteInput shadow-md p-2 rounded-md text-center font-bold mb-2'>Progreso: {visualProgress}%</div>
                <div className='w-full bg-gray-300 rounded-full h-4'>
                  <div 
                    className='bg-[#2FD28E] h-4 rounded-full transition-all duration-300' 
                    style={{width: `${visualProgress}%`}}
                  ></div>
                </div>
              </div>
          </div>
          {showDetailOrderWork.working_state === "paused" && (
            <div className='mt-3 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded'>
              <strong>Estado: Pausada</strong> - La actividad se ha pausado. Puede reanudarla desde donde quedó usando el botón &quot;Reanudar&quot;.
            </div>
          )}
      </Modal>
      <Modal setOpen={modalIsOpenBlocks} title='Motivo del bloqueo' className='max-w-xs'>
          <div className="flex justify-end relative bottom-10">
            <button
              type="button"
              onClick={() => {
                setModalIsOpenBlocks(false)
                setValueSelect('')
                setDisabledBtnBlock(true)
              }}
            >
              <Image
                src={close}
                alt="Close"
              />
            </button>
          </div>
          <div>
            <div>Seleccione un motivo de bloqueo</div>
            <select 
            onChange={(e) => onChangeSelection(e.target.value)}
            className="w-full border border-solid border-gray-400 rounded-full mt-5 p-2" placeholder='Seleccionar motivo'>
            <option
            value={''}
            >{'Seleccione una razon'}</option>
              {blockReasons?.block_reasons?.map((reason: any) =>
                <option value={reason.id} key={reason.id}>{reason.name}</option>
              )}
            </select>
          </div>
          <div className="mb-3 mt-5 text-center">
            <button 
            disabled={disabledBtnBlock}
            onClick={() => executeWorkOrderAction('block_work_order', valueSelect)} key="block" className='font-bold bg-red-500 p-3 rounded-md w-[400] disabled:opacity-50'>Bloquear</button>
          </div>
            
      </Modal>
      <Modal setOpen={modalIsOpenCompleteOrder} title='Ingresa la cantidad' className='max-w-xs'>
          <div className="flex justify-end relative bottom-10">
            <button
              type="button"
              onClick={() => {
                setModalIsOpenCompleteOrder(false)
                setQtyDone(0)
              }}
            >
              <Image
                src={close}
                alt="Close"
              />
            </button>
          </div>
          {user.role === "Operario" ? (
            <div className="mb-5 z-50">
              <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Cantidad</label>
              <div className="shadow-sm bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5">
                {orderProductionSelected?.product_qty}
              </div>
            </div>
          ) : (
            <div className="mb-5 z-50">
              <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Ingresa la cantidad</label>
              <input  
              min="1" 
              type="number" 
              value={qtyDone}
              onChange={(e) => setQtyDone(parseInt(e.target.value))} 
              className="shadow-sm bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" required />
            </div>
          )}
          <div className="mb-3 mt-5 text-center">
            <button 
            disabled={user.role === "Operario" ? false : qtyDone === 0}
            onClick={() => {
              setModalIsOpenCompleteOrder(false)
              const finalQty = user.role === "Operario" ? orderProductionSelected?.product_qty : qtyDone
              setQtyDone(0)
              executeWorkOrderAction('finish_work_order', undefined, finalQty)
            }}
            className='w-full font-bold bg-indigo-100 p-3 rounded-md disabled:opacity-50'>Aceptar</button>
          </div>
            
      </Modal>
      <Modal setOpen={modalIsMaterials} title='Materiales' className='max-w-3xl'>
        <div className="flex justify-end relative bottom-10">
          <button
            type="button"
            onClick={() => {
              setModalIsMaterials(false)
              setDisabledBtnSaveMaterial(true)
            }}
          >
            <Image
              src={close}
              alt="Close"
            />
          </button>
        </div>
        {materials.length === 0 &&
            <div className="rounded-md absolute p-7 top-[50%] left-[50%] transform translate-x-[-50%] translate-y-[-50%] bg-white shadow-[0_35px_60px_-15px_rgba(0.7,0,0,0.7)]">                
              <svg aria-hidden="true" className="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-gray-600 dark:fill-gray-300" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
              </svg>
              <span className="ml-2">Cargando ...</span>
            </div>}
        {!user.materiales && <div className='pb-5'>Su usuario no tiene permitido añadir materiales adicionales al BOM. Contacte con un supervisor.</div>}
        {error !== '' && <div className='mb-5 font-bold bg-[#A9D1DC] p-3 rounded-md w-full'>{error}</div>}
        <div className="relative overflow-x-auto overflow-y-auto max-w-full max-h-[500px] rounded">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 relative overflow-y-auto">
            {materials.length > 0 && 
            <thead className="text-xs text-black uppercase  dark:text-black bg-strongCyan border-b-8 border-white sticky top-0">
                  <tr>
                    <th scope="col" className="px-6 py-3 ">
                      Nombre
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Cantidad
                    </th>
                    <th scope="col" className="px-6 py-3">
                      U/M
                    </th>
                    <th scope="col" className="px-6 py-3">
                    Ubicación
                    </th>
                  </tr>
              </thead>}
              <tbody>
                {materials?.map((material: any) => (
                  <tr key={`production-order-${material.id}`} className="border-b-8 border-white dark:bg-white dark:border-white bg-lightCyan text-black">
                      <td className="px-3 py-2">
                        {material?.product_id[1]}
                      </td>
                      <td className="px-3 py-2">{ Math.floor(material?.product_uom_qty || 0)}</td>
                      <td className="px-3 py-2">{material?.product_uom[1]}</td>
                      <td className="px-3 py-2">{material?.location_id[1]}</td>
                      
                  </tr>
                  ))}
              </tbody>
          </table>
        </div>
        {materials.length > 0 && 
          <div className="mb-3 mt-5 text-center flex justify-center ">
            <div>
              <button disabled={disabledBtnSaveMaterial}  onClick={() => onSaveMaterialsOrder()} className='disabled:opacity-50 bg-[#2FD28E] font-bold p-2 rounded-md mr-4'>Guardar Material</button>
            </div>
            <div>
            <button disabled={!user.materiales} onClick={() => { setModalIsAddMaterials(true)}}  className='disabled:opacity-50 bg-[#020630] font-bold text-[#FEC400] p-2 rounded-md mr-4'>Agregar Material</button>
            </div>
          </div>}
        {loadigSaveMaterials && 
          <div className="rounded-md absolute p-7 top-[50%] left-[50%] transform translate-x-[-50%] translate-y-[-50%] bg-white shadow-[0_35px_60px_-15px_rgba(0.7,0,0,0.7)]">                
            <svg aria-hidden="true" className="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-gray-600 dark:fill-gray-300" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
              <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
            </svg>
              <span className="ml-2">Procesando ...</span>
          </div>}
      </Modal>
      <Modal setOpen={modalIsAddMaterials} title='Agregar Material' className='max-w-xs'>
        <div className="flex justify-end relative bottom-10">
          <button
            type="button"
            onClick={() => {
              setModalIsAddMaterials(false)
            }}
          >
            <Image
              src={close}
              alt="Close"
            />
          </button>
        </div>
        <div>Seleccione un producto</div>
          <select 
          onChange={(e) => onChangeMaterial(e.target.value)}
          className="w-full border border-solid border-gray-400 rounded-full mt-5 p-2" placeholder='Seleccionar motivo'>
          <option
          value={''}
          >{'Seleccione producto'}</option>
            {materials?.map((material: any) =>
              <option value={material.id} key={material.id}>{material?.product_id[1]}</option>
            )}
          </select>
          <div>
            <input
              type="number"
              className="w-full border border-solid border-gray-400 rounded-full mt-5 p-2"
              placeholder="Ingrese la medida"
              min="0"
              disabled={disabledBtnAddMaterials}
              onChange={(e) => onChangeTotalMaterial(e.target.value)}
              value={valueTotalMaterial}
            />
          </div>
          <div className="mb-3 mt-5 text-center">
            <button 
            disabled={(disabledBtnAddMaterials || Number(valueTotalMaterial) === 0)}
            onClick={() =>  {
              onAddMaterial(valueSelectMaterial, valueTotalMaterial)
              setModalIsAddMaterials(false)
              setvValueTotalMaterial(0)
              setvValueSelectMaterial('')
              }} key="block" className='text-white font-bold bg-[#020630] p-3 rounded-md w-[400] disabled:opacity-50'>Guardar</button>
          </div>
      </Modal>
    </>
  )
}
