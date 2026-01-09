"use client";
import { Modal } from "@/ui/modal/modal";
import Image from "next/image";
import close from "@/public/close.png";
import { useState } from "react";
import { StatusBadge } from "@/ui/status-badge/status-badge";
import { getMaterialsOrder, saveMaterialsOrder } from "@/app/api/getMaterialsOrder/getMaterialsOrder";

function ModalOrderQualityDetails({
  orderQualityDetail,
  modalWorkOrderDetail,
  openJobDetail,
  selectedOrderQuantity,
  acceptOrder,
  user

}: {
  orderQualityDetail: any;
  modalWorkOrderDetail: boolean;
  openJobDetail: () => void;
  selectedOrderQuantity: any
  acceptOrder: () => void;
  user?: any;
}) {
  const [measureValue, setMeasureValue] = useState<number>(selectedOrderQuantity?.measure || 0);
  const [modalIsMaterials, setModalIsMaterials] = useState(false);
  const [materials, setMaterials] = useState<any>([]);
  const [modalIsAddMaterials, setModalIsAddMaterials] = useState(false);
  const [loadigSaveMaterials, setLoadigSaveMaterials] = useState(false);
  const [orderMaterialsSelected, setOrderMaterialsSelected] = useState<any>({});
  const [disabledBtnSaveMaterial, setDisabledBtnSaveMaterial] = useState(true);
  const [valueSelectMaterial, setvValueSelectMaterial] = useState('');
  const [valueTotalMaterial, setvValueTotalMaterial] = useState(0);
  const [disabledBtnAddMaterials, setDisabledBtnAddMaterials] = useState(true);

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

  const getMaterials = async () => {
    setMaterials([])
    const materials = await getMaterialsOrder(user, selectedOrderQuantity.move_raw_ids).then( res => res).catch((err) => console.log(err))
    if(materials?.status) {
      setMaterials(materials.data)
    }
  }

  const onAddMaterial = async (material: any, total: number) => { 
    const objeto = { material: material }; 
    const materialSelected = materials.find((material: any) => material.id === parseInt(objeto.material))
    materialSelected.product_uom_qty = total
    materialSelected.quantity_done = total
    setOrderMaterialsSelected(materialSelected)
    setDisabledBtnSaveMaterial(false)
  }

  const onSaveMaterialsOrder = async () => {
    setLoadigSaveMaterials(true)
    const data = await saveMaterialsOrder(user, selectedOrderQuantity.id, selectedOrderQuantity.production_id[0], orderMaterialsSelected.product_id[0], orderMaterialsSelected.product_uom[0], orderMaterialsSelected.quantity_done, materials)

    if (data?.status) {
      setLoadigSaveMaterials(false)
    } else {
      setLoadigSaveMaterials(false)
    }
    setDisabledBtnSaveMaterial(true)
    setModalIsMaterials(false)
    setOrderMaterialsSelected({})
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
              <div className='bg-whiteInput min-h-12 shadow-md p-2 rounded-md text-center break-words overflow-hidden'>{selectedOrderQuantity?.production_id[1]}</div>
            </div>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className=''>
                <div className='font-bold text-center'>{labels.qualityControlLabel}</div>
                <div className='bg-whiteInput min-h-12 shadow-md p-2 rounded-md text-center break-words overflow-hidden'>{selectedOrderQuantity?.name}</div>
              </div>
              <div className=''>
                <div className='font-bold text-center'>{labels.workCenterLabel}</div>
                <div className='bg-whiteInput min-h-12 shadow-md p-2 rounded-md text-center break-words overflow-hidden'>{selectedOrderQuantity?.workcenter_id?.[1] || 'N/A'}</div>
              </div>
              <div className=''>
                <div className='font-bold text-center'>{labels.workOrderLabel}</div>
                <div className='bg-whiteInput min-h-12 shadow-md p-2 rounded-md text-center break-words overflow-hidden'>{selectedOrderQuantity?.workorder_id}</div>
              </div>
              <div className=''>
                <div className='font-bold text-center'>{labels.mesureLabel}</div>
                <div className='flex'>
                  <input type="number" min="0" value={measureValue} onChange={(e) => setMeasureValue(parseInt(e.target.value) || 0)} className='bg-whiteInput min-h-12 w-full shadow-md rounded-md text-center focus:outline-none text-gray-900' placeholder="0"/>
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
            {user?.role === "Calidad" && (
              <button onClick={() => {setModalIsMaterials(true), getMaterials()}} className='font-bold bg-[#1D4C92] text-white p-3 rounded-md w-full mt-2'>Materiales</button>
            )}
          </div>
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
        {!user?.materiales && <div className='pb-5'>Su usuario no tiene permitido añadir materiales adicionales al BOM. Contacte con un supervisor.</div>}
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
                  <tr key={`material-${material.id}`} className="border-b-8 border-white dark:bg-white dark:border-white bg-lightCyan text-black">
                      <td className="px-3 py-2">
                        {material?.product_id[1]}
                      </td>
                      <td className="px-3 py-2">{ Math.floor(material?.quantity_done)}</td>
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
            <button disabled={!user?.materiales} onClick={() => { setModalIsAddMaterials(true)}}  className='disabled:opacity-50 bg-[#020630] font-bold text-[#FEC400] p-2 rounded-md mr-4'>Agregar Material</button>
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
              }} className='text-white font-bold bg-[#020630] p-3 rounded-md w-[400] disabled:opacity-50'>Guardar</button>
          </div>
      </Modal>
    </>
  );
}

export default ModalOrderQualityDetails;