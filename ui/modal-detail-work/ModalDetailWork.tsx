"use client"
import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from "@/ui/modal/modal"
import Image from 'next/image'
import close from '@/public/close.png'
import { StatusBadge } from '@/ui/status-badge/status-badge'

function isWorkOrderBlocked(workOrder: any) {
  return Boolean(workOrder?.local_blocked || workOrder?.working_state === 'blocked');
}

function getOdooName(value: any, fallback = 'N/A') {
  if (Array.isArray(value)) return value[1] || fallback;
  if (typeof value === 'string' && value.trim()) return value;
  return fallback;
}

function isRole(user: any, role: string) {
  return String(user?.role || '').trim() === role;
}

function getDefaultDoneQuantity(orderProductionSelected: any, showDetailOrderWork: any) {
  const quantity = Number(
    orderProductionSelected?.product_qty
      ?? showDetailOrderWork?.product_qty
      ?? showDetailOrderWork?.qty_production
      ?? 0
  );

  return Number.isFinite(quantity) ? quantity : 0;
}

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
  materialsLoading,
  materialsError,
  setModalIsAddMaterials,
  modalIsAddMaterials,
  onAddMaterial,
  loadigSaveMaterials,
  onSaveMaterialsOrder,
  disabledBtnSaveMaterial,
  setDisabledBtnSaveMaterial,
  user,
  error,
  onCloseError,
  qualityPauseMessage,
  onCloseQualityPauseMessage,
  onSharedTimerSync,
}: {
  modalIsOpenJobDetail: boolean
  showDetailOrderWork?: any 
  orderProductionSelected?: any 
  progress?: number
  setModalIsOpenJobDetail: any
  modalIsOpenInstructions: boolean
  openModalInstructions: () => void
  executeWorkOrderAction: (action:string, block_reason?: any | undefined, qtyDone?: number | undefined, elapsedSeconds?: number | undefined ) => void
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
  materialsLoading: boolean
  materialsError: string
  setModalIsAddMaterials: any
  modalIsAddMaterials: boolean
  onAddMaterial: (material:any, total: number) => void
  loadigSaveMaterials: boolean
  onSaveMaterialsOrder: () => void
  disabledBtnSaveMaterial: boolean
  setDisabledBtnSaveMaterial: any
  user: any
  error: string
  onCloseError: () => void
  qualityPauseMessage?: string
  onCloseQualityPauseMessage?: () => void
  onSharedTimerSync?: (timer: any) => void
}) {
  const [valueSelect, setValueSelect] = useState('');
  const [qtyDone, setQtyDone] = useState<number>(orderProductionSelected?.product_qty || 0 );
  const [disabledBtnBlock, setDisabledBtnBlock] = useState(true);
  const [valueSelectMaterial, setvValueSelectMaterial] = useState('');
  const [valueTotalMaterial, setvValueTotalMaterial] = useState(0);
  const [disabledBtnAddMaterials, setDisabledBtnAddMaterials] = useState(true);
  const sharedTimerSyncRef = useRef(onSharedTimerSync);
  const isWorkOrderDone = ['done', 'completed', 'cancel'].includes(showDetailOrderWork?.state);
  const isBlocked = isWorkOrderBlocked(showDetailOrderWork);
  const isTimerRunning = Boolean(showDetailOrderWork?.is_user_working && !isBlocked && !isWorkOrderDone);
  const normalizedRealDurationSeconds = Number(showDetailOrderWork?.piso_real_duration_seconds);
  const normalizedExpectedSeconds = Number(showDetailOrderWork?.piso_expected_duration_seconds);
  const baseElapsedSeconds = useMemo(() => {
    return Number.isFinite(normalizedRealDurationSeconds)
      ? Math.max(0, Math.round(normalizedRealDurationSeconds))
      : Math.max(0, Math.round(Number(showDetailOrderWork?.duration || 0) * 60) + Number(showDetailOrderWork?.piso_active_elapsed_seconds || 0));
  }, [normalizedRealDurationSeconds, showDetailOrderWork?.duration, showDetailOrderWork?.piso_active_elapsed_seconds]);
  const [elapsedSeconds, setElapsedSeconds] = useState(baseElapsedSeconds);
  const isEffectivelyPaused = Boolean(
    !isBlocked
    && !isWorkOrderDone
    && !showDetailOrderWork?.quality_failed
    && !isTimerRunning
    && (showDetailOrderWork?.working_state === 'paused' || elapsedSeconds > 0)
  );
  const expectedSeconds = Number.isFinite(normalizedExpectedSeconds)
    ? Math.max(0, Math.round(normalizedExpectedSeconds))
    : Math.max(Number(showDetailOrderWork?.duration_expected || 0) * 60, 0);
  const realProgress = expectedSeconds > 0 ? Math.floor((elapsedSeconds / expectedSeconds) * 100) : progress || 0;
  const progressBarWidth = Math.min(Math.max(realProgress, 0), 100);
  const defaultDoneQuantity = getDefaultDoneQuantity(orderProductionSelected, showDetailOrderWork);
  const canEditDoneQuantity = isRole(user, 'Jefe') || isRole(user, 'Lider');

  useEffect(() => {
    sharedTimerSyncRef.current = onSharedTimerSync;
  }, [onSharedTimerSync]);

  useEffect(() => {
    setElapsedSeconds(baseElapsedSeconds);
  }, [showDetailOrderWork?.id, showDetailOrderWork?.duration, showDetailOrderWork?.piso_active_elapsed_seconds, showDetailOrderWork?.piso_duration_calculated_at, showDetailOrderWork?.is_user_working, showDetailOrderWork?.working_state, showDetailOrderWork?.state, baseElapsedSeconds]);

  useEffect(() => {
    if (modalIsOpenCompleteOrder) {
      setQtyDone(defaultDoneQuantity);
    }
  }, [modalIsOpenCompleteOrder, defaultDoneQuantity]);

  useEffect(() => {
    const workOrderId = Number(showDetailOrderWork?.id);
    if (!modalIsOpenJobDetail || !workOrderId) return;

    let active = true;
    let requestInFlight = false;
    const syncSharedTimer = async () => {
      if (requestInFlight) return;
      requestInFlight = true;
      let timer: any;
      try {
        const response = await fetch(`/api/work-order-timers/${workOrderId}`, {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        if (response.status === 401) {
          window.location.assign('/login');
          return;
        }
        if (!response.ok) {
          throw new Error(`Error HTTP ${response.status} consultando el reloj compartido.`);
        }
        timer = await response.json();
      } catch (error) {
        console.error('No se pudo actualizar el reloj compartido de la OT:', error);
        return;
      } finally {
        requestInFlight = false;
      }
      if (!active || !timer?.status) return;

      const sharedTimerChanged = Boolean(timer.is_running) !== isTimerRunning;
      const sharedBlockChanged = Boolean(timer.local_blocked) !== isBlocked;
      const sharedElapsedSeconds = timer.has_timer_snapshot === false
        ? baseElapsedSeconds
        : Math.max(0, Math.round(Number(timer.elapsed_seconds) || 0));
      const sharedWorkOrderState = timer?.workorder_state?.toString?.().trim?.().toLowerCase?.() || '';
      const sharedDone = sharedWorkOrderState === 'done';
      const shouldBePaused = Boolean(
        !timer.is_running
        && !sharedDone
        && !timer.local_blocked
        && !showDetailOrderWork?.quality_failed
        && !isWorkOrderDone
        && timer.has_timer_snapshot !== false
      );
      const sharedStatusChanged = timer.is_running
        ? showDetailOrderWork?.working_state !== 'progress' || !showDetailOrderWork?.is_user_working
        : sharedDone
          ? !['done', 'completed'].includes(showDetailOrderWork?.state)
          : shouldBePaused && showDetailOrderWork?.working_state !== 'paused';
      const timerExpectedSeconds = Number(timer.expected_duration_seconds);
      const sharedExpectedChanged = Number.isFinite(timerExpectedSeconds)
        && timerExpectedSeconds > 0
        && timerExpectedSeconds !== normalizedExpectedSeconds;

      // El valor visible sale siempre del reloj central de Piso. Ninguna sesion
      // mantiene un contador independiente en memoria.
      if (timer.has_timer_snapshot !== false) {
        setElapsedSeconds(sharedElapsedSeconds);
      }

      // El estado visual se reconcilia aunque el booleano de ejecucion ya
      // coincida, porque otra sesion puede conservar "paused" en memoria.
      if (sharedTimerChanged || sharedBlockChanged || sharedStatusChanged || sharedExpectedChanged) {
        sharedTimerSyncRef.current?.(timer);
      }
    };

    void syncSharedTimer();
    const interval = window.setInterval(() => void syncSharedTimer(), 500);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [modalIsOpenJobDetail, showDetailOrderWork?.id, showDetailOrderWork?.working_state, showDetailOrderWork?.is_user_working, showDetailOrderWork?.quality_failed, isTimerRunning, isBlocked, isWorkOrderDone, normalizedExpectedSeconds, baseElapsedSeconds]);

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

  const theoreticalDuration = expectedSeconds > 0 ? formatElapsedTime(expectedSeconds) : formatDurationFromMinutes(showDetailOrderWork?.duration_expected, showDetailOrderWork?.theoretical_duration);
  const realDuration = formatElapsedTime(elapsedSeconds);
  const displayStatus = showDetailOrderWork.quality_failed
    ? 'quality_failed'
    : isWorkOrderBlocked(showDetailOrderWork)
    ? 'blocked'
    : isTimerRunning
      ? 'progress'
    : isEffectivelyPaused
      ? 'paused'
      : showDetailOrderWork.state;

  const renderButtons = (showDetailOrderWork: any) => {
    const isBlocked = isWorkOrderBlocked(showDetailOrderWork);
    const isUserWorking = showDetailOrderWork.is_user_working;
    const isPaused = !isBlocked
      && !isUserWorking
      && (showDetailOrderWork.working_state === "paused" || elapsedSeconds > 0);
    const canUnblock = isRole(user, 'Jefe');
    const canReleaseQualityFailure = isRole(user, 'Lider') || isRole(user, 'Jefe');
    const isFailedForOperator = Boolean(showDetailOrderWork.quality_failed && isRole(user, 'Operario'));
    const buttons = [];
    const disabledBtns = ['done', 'completed', 'cancel'].includes(showDetailOrderWork.state)

    if (isBlocked) {
      if (canUnblock) {
        return <div className="mb-3"><button key="unblock" onClick={() => executeWorkOrderAction('unblock_work_order', undefined, undefined, elapsedSeconds)} className='font-bold bg-red-500 p-3 rounded-md w-full'>Desbloquear</button></div>
      }

      return <div className="mb-3 rounded-md bg-red-100 p-3 text-center font-bold text-red-800">Orden bloqueada</div>
    }

    if (showDetailOrderWork.quality_failed) {
      if (canReleaseQualityFailure) {
        return (
          <>
            <div className="mb-3 rounded-md bg-red-100 p-3 text-center font-bold text-red-800">Control de calidad fallado</div>
            <div className="mb-3">
              <button key="release-quality" onClick={() => executeWorkOrderAction('release_quality_failure', undefined, undefined, elapsedSeconds)} className='font-bold bg-[#2FD28E] p-3 rounded-md w-full'>Reactivar OT</button>
            </div>
          </>
        )
      }

      if (isFailedForOperator) {
        return <div className="mb-3 rounded-md bg-red-100 p-3 text-center font-bold text-red-800">Control de calidad fallado</div>
      }
    }

    if (disabledBtns) {
      return <div className="mb-3 rounded-md bg-gray-100 p-3 text-center font-bold text-gray-700">Orden terminada</div>
    }

    // Show Start button only if activity hasn't begun
    if (!isBlocked && !isUserWorking && showDetailOrderWork.duration === 0) {
      buttons.push(<div className="mb-3"><button disabled={disabledBtns} onClick={() => executeWorkOrderAction('start_work_order', undefined, undefined, elapsedSeconds)} key="start" className='disabled:opacity-50 font-bold bg-[#2FD28E] p-3 rounded-md w-full'>Inicio</button></div>)
    }

    // Show Resume button if paused
    if (!isBlocked && isPaused && !isUserWorking) {
      buttons.push(<div className="mb-3"><button disabled={disabledBtns} onClick={() => executeWorkOrderAction('start_work_order', undefined, undefined, elapsedSeconds)} key="resume" className='disabled:opacity-50 font-bold bg-[#2FD28E] p-3 rounded-md w-full'>Reanudar</button></div>)
    }

    buttons.push(<div className="mb-3"><button disabled={disabledBtns} onClick={() => setModalIsOpenBlocks(true)} key="block" className='disabled:opacity-50 font-bold bg-red-500 p-3 rounded-md w-full'>Bloquear</button></div>)
  
    // Pause is only available while the timer is running.
    if (!isBlocked && isUserWorking) {
      buttons.push(<div className="mb-3"><button key="stop" onClick={() => executeWorkOrderAction('stop_work_order', undefined, undefined, elapsedSeconds)} className='font-bold bg-[#2FD28E] p-3 rounded-md w-full'>Pausar</button></div>)
    }

    // Done is available while running or paused; Odoo validates quality and final state.
    if (!isBlocked && (isUserWorking || isPaused)) {
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

  const instructionNote = showDetailOrderWork?.quality_instruction_note || showDetailOrderWork?.operation_note || showDetailOrderWork?.note || '';
  const instructionUrlCandidate = showDetailOrderWork?.worksheet_google_slide || showDetailOrderWork?.worksheet_url || '';
  const instructionUrl = typeof instructionUrlCandidate === 'string' && /^https?:\/\//i.test(instructionUrlCandidate)
    ? instructionUrlCandidate
    : '';
  const hasInstructions = Boolean(instructionNote || showDetailOrderWork?.worksheet || instructionUrl);

  return (
    <>
      <Modal setOpen={Boolean(error)} title='Mensaje' className='max-w-md'>
        <div className="text-gray-900">
          <div className="mb-5 rounded-md bg-[#A9D1DC] p-4 font-medium">
            {error}
          </div>
          <div className="text-center">
            <button
              type="button"
              onClick={onCloseError}
              className="font-bold bg-[#2FD28E] p-3 rounded-md w-full"
            >
              Aceptar
            </button>
          </div>
        </div>
      </Modal>
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
        {instructionNote &&
        <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: instructionNote }} />}
        {!hasInstructions &&
        <div className="font-bold text-center" >No posee instrucciones</div>}
        {showDetailOrderWork?.worksheet && 
        <div ><iframe width={'100%'} height="600px"  src={`data:application/pdf;base64,${showDetailOrderWork?.worksheet}`} ></iframe></div>}
        {instructionUrl &&
        <div className="mt-4">
          <a className="font-bold text-blue-700 underline" href={instructionUrl} target="_blank" rel="noreferrer">Abrir documento de instrucciones</a>
        </div>}
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
            <div className="rounded-md absolute p-7 top-[50%] left-[50%] transform translate-x-[-50%] translate-y-[-50%] bg-white dark:bg-gray-800 dark:text-gray-100 shadow-[0_35px_60px_-15px_rgba(0.7,0,0,0.7)]">                
              <svg aria-hidden="true" className="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-gray-600 dark:fill-gray-300" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
              </svg>
                <span className="ml-2">Procesando ...</span>
            </div>}
          <div className='flex justify-between'>
              <div className='w-[80vh]'>
                  <div className='mb-3 w-90'>
                      <div className='font-bold text-center dark:text-gray-100'>Nombre de la Orden</div>
                      <div className='bg-whiteInput dark:bg-gray-700 dark:text-gray-100 shadow-md p-2 rounded-md text-center'>{showDetailOrderWork?.name}</div>
                  </div>
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                      <div className=''>
                          <div className='font-bold text-center dark:text-gray-100'>Inicio Programado</div>
                          <div className='bg-whiteInput dark:bg-gray-700 dark:text-gray-100 shadow-md p-2 rounded-md text-center'>{showDetailOrderWork?.date_start? showDetailOrderWork.date_start : 'No definida'}</div>
                      </div>
                    <div className=''>
                        <div className='font-bold text-center dark:text-gray-100'>Final Programado</div>
                        <div className='bg-whiteInput dark:bg-gray-700 dark:text-gray-100 shadow-md p-2 rounded-md text-center'>{showDetailOrderWork?.date_finished ? showDetailOrderWork.date_finished : 'No definida'}</div>
                    </div>
                    <div className=''>
                        <div className='font-bold text-center dark:text-gray-100'>Duración teorica</div>
                        <div className='bg-whiteInput dark:bg-gray-700 dark:text-gray-100 shadow-md p-2 rounded-md text-center font-mono text-lg'>{theoreticalDuration}</div>
                    </div>
                    <div className=''>
                        <div className='font-bold text-center dark:text-gray-100'>Duración real</div>
                        <div className='bg-whiteInput dark:bg-gray-700 dark:text-gray-100 shadow-md p-2 rounded-md h-10 text-center font-mono text-lg'>{realDuration}</div>
                    </div>
                    <div className=''>
                        <div className='font-bold text-center dark:text-gray-100'>Centro de trabajo</div>
                        <div className='bg-whiteInput dark:bg-gray-700 dark:text-gray-100 shadow-md p-2 rounded-md text-center'>{getOdooName(showDetailOrderWork?.workcenter_id, 'Sin centro de trabajo')}</div>
                    </div>
                    <div className=''>
                        <div className='font-bold text-center dark:text-gray-100'>Cantidad</div>
                        <div className='bg-whiteInput dark:bg-gray-700 dark:text-gray-100 shadow-md p-2 rounded-md text-center'>{orderProductionSelected?.product_qty}</div>
                    </div>
                  </div>
              </div>
              <div className='ml-10'>
                {renderButtons(showDetailOrderWork)}
              </div>
          </div>
            <div className='flex mt-5 '>
              <div className='w-[50vh] mr-5 bg-whiteInput shadow-md p-2 rounded-md text-center'><StatusBadge status={displayStatus} /></div>
              <div className='w-[50vh] mr-5'>
                <div className='bg-whiteInput dark:bg-gray-700 dark:text-gray-100 shadow-md p-2 rounded-md text-center font-bold mb-2'>Progreso: {realProgress}%</div>
                <div className='w-full bg-gray-300 dark:bg-gray-600 rounded-full h-4'>
                  <div 
                    className='bg-[#2FD28E] h-4 rounded-full transition-all duration-300' 
                    style={{width: `${progressBarWidth}%`}}
                  ></div>
                </div>
              </div>
          </div>
          {isWorkOrderBlocked(showDetailOrderWork) && (
            <div className='mt-3 bg-red-100 border border-red-500 text-red-800 px-4 py-3 rounded'>
              <strong>Estado: Bloqueada</strong>
              {showDetailOrderWork?.local_block_reason_name ? ` - Motivo: ${showDetailOrderWork.local_block_reason_name}` : ''}. Solo un Jefe puede desbloquear esta orden de trabajo.
            </div>
          )}
          {showDetailOrderWork.quality_failed && (
            <div className='mt-3 bg-red-100 border border-red-500 text-red-800 px-4 py-3 rounded'>
              <strong>Control de calidad fallado</strong>
              {showDetailOrderWork?.quality_failed_points?.length ? ` - ${showDetailOrderWork.quality_failed_points.join(', ')}` : ''}. El operador no puede continuar hasta que Lider o Calidad revise el control.
            </div>
          )}
          {isEffectivelyPaused && (
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
            <div className="dark:text-gray-100">Seleccione un motivo de bloqueo</div>
            <select 
            onChange={(e) => onChangeSelection(e.target.value)}
            className="w-full border border-solid border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-100 rounded-full mt-5 p-2" placeholder='Seleccionar motivo'>
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
            onClick={() => executeWorkOrderAction('block_work_order', valueSelect, undefined, elapsedSeconds)} key="block" className='font-bold bg-red-500 p-3 rounded-md w-[400] disabled:opacity-50'>Bloquear</button>
          </div>
            
      </Modal>
      <Modal setOpen={modalIsOpenCompleteOrder} title='Ingresa la cantidad' className='max-w-xs'>
          <div className="flex justify-end relative bottom-10">
            <button
              type="button"
              onClick={() => {
                setModalIsOpenCompleteOrder(false)
                setQtyDone(defaultDoneQuantity)
              }}
            >
              <Image
                src={close}
                alt="Close"
              />
            </button>
          </div>
          {!canEditDoneQuantity ? (
            <div className="mb-5 z-50">
              <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Cantidad</label>
              <div className="shadow-sm bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5">
                {defaultDoneQuantity}
              </div>
            </div>
          ) : (
            <div className="mb-5 z-50">
              <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Ingresa la cantidad</label>
              <input  
              min="1" 
              type="number" 
              value={qtyDone}
              onChange={(e) => setQtyDone(Number(e.target.value))} 
              className="shadow-sm bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" required />
            </div>
          )}
          <div className="mb-3 mt-5 text-center">
            <button 
            disabled={canEditDoneQuantity ? qtyDone <= 0 : defaultDoneQuantity <= 0}
            onClick={() => {
              setModalIsOpenCompleteOrder(false)
              const finalQty = canEditDoneQuantity ? qtyDone : defaultDoneQuantity
              setQtyDone(defaultDoneQuantity)
              executeWorkOrderAction('finish_work_order', undefined, finalQty, elapsedSeconds)
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
        {materialsLoading &&
            <div className="rounded-md absolute p-7 top-[50%] left-[50%] transform translate-x-[-50%] translate-y-[-50%] bg-white dark:bg-gray-800 dark:text-gray-100 shadow-[0_35px_60px_-15px_rgba(0.7,0,0,0.7)]">                
              <svg aria-hidden="true" className="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-gray-600 dark:fill-gray-300" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
              </svg>
              <span className="ml-2">Cargando ...</span>
            </div>}
        {!materialsLoading && materialsError &&
          <div className="mb-5 rounded-md border border-red-400 bg-red-50 p-4 text-center text-red-800">
            <div className="mb-3 font-medium">{materialsError}</div>
            <button type="button" onClick={() => getMaterials()} className="rounded-md bg-[#1D4C92] px-4 py-2 font-bold text-white">Reintentar</button>
          </div>}
        {!materialsLoading && !materialsError && materials.length === 0 &&
          <div className="mb-5 rounded-md bg-gray-100 p-4 text-center font-medium text-gray-700">
            No hay materiales disponibles para esta orden de trabajo.
          </div>}
        {!user.materiales && <div className='pb-5'>Su usuario no tiene permitido añadir materiales adicionales al BOM. Contacte con un supervisor.</div>}
        <div className="relative overflow-x-auto overflow-y-auto max-w-full max-h-[500px] rounded">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 relative overflow-y-auto">
            {materials.length > 0 && 
            <thead className="text-xs text-black dark:text-gray-100 uppercase bg-strongCyan dark:bg-sky-900 border-b-8 border-white dark:border-gray-700 sticky top-0">
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
                  <tr key={`production-order-${material.id}`} className="border-b-8 border-white dark:border-gray-700 bg-lightCyan dark:bg-gray-600 text-black dark:text-gray-100">
                      <td className="px-3 py-2">
                        {getOdooName(material?.product_id, 'Sin producto')}
                      </td>
                      <td className="px-3 py-2">{Number(material?.product_uom_qty || 0).toLocaleString('es-CL', { maximumFractionDigits: 4 })}</td>
                      <td className="px-3 py-2">{getOdooName(material?.product_uom, 'Sin unidad')}</td>
                      <td className="px-3 py-2">{getOdooName(material?.location_id, 'Sin ubicacion')}</td>
                      
                  </tr>
                  ))}
              </tbody>
          </table>
        </div>
        {materials.length > 0 && 
          <div className="mb-3 mt-5 text-center flex justify-center ">
            <div>
              <button disabled={disabledBtnSaveMaterial || loadigSaveMaterials} onClick={() => onSaveMaterialsOrder()} className='disabled:opacity-50 bg-[#2FD28E] font-bold p-2 rounded-md mr-4'>Guardar Material</button>
            </div>
            <div>
            <button disabled={!user.materiales} onClick={() => { setModalIsAddMaterials(true)}}  className='disabled:opacity-50 bg-[#020630] font-bold text-[#FEC400] p-2 rounded-md mr-4'>Agregar Material</button>
            </div>
          </div>}
        {loadigSaveMaterials && 
          <div className="rounded-md absolute p-7 top-[50%] left-[50%] transform translate-x-[-50%] translate-y-[-50%] bg-white dark:bg-gray-800 dark:text-gray-100 shadow-[0_35px_60px_-15px_rgba(0.7,0,0,0.7)]">                
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
              setDisabledBtnAddMaterials(true)
              setvValueSelectMaterial('')
              setvValueTotalMaterial(0)
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
              <option value={material.id} key={material.id}>{getOdooName(material?.product_id, 'Sin producto')}</option>
            )}
          </select>
          <div>
            <input
              type="number"
              className="w-full border border-solid border-gray-400 rounded-full mt-5 p-2"
              placeholder="Cantidad adicional"
              min="0.0001"
              step="any"
              disabled={disabledBtnAddMaterials}
              onChange={(e) => onChangeTotalMaterial(e.target.value)}
              value={valueTotalMaterial}
            />
          </div>
          <div className="mb-3 mt-5 text-center">
            <button 
            disabled={disabledBtnAddMaterials || !Number.isFinite(Number(valueTotalMaterial)) || Number(valueTotalMaterial) <= 0}
            onClick={() =>  {
              onAddMaterial(valueSelectMaterial, valueTotalMaterial)
              setModalIsAddMaterials(false)
              setvValueTotalMaterial(0)
              setvValueSelectMaterial('')
              }} key="block" className='w-full text-white font-bold bg-[#020630] p-3 rounded-md disabled:opacity-50'>Guardar</button>
          </div>
      </Modal>
    </>
  )
}
