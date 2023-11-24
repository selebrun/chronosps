import React from 'react'
import { useState, useEffect } from 'react'
import { StatusBadge } from '@/ui/status-badge/status-badge'
import Image from 'next/image'
import eyeDetails from '@/public/eyeDetails.svg'


export const OrderTableModalWork = ({ orderDetail, thOrder, thStatus, thProduct, openJobDetail }: {
    orderDetail: any, 
    thOrder: string,
    thStatus: string,
    thProduct: string,
    openJobDetail: (id: string) => void
  }) => {

  return (
    <div className="relative overflow-x-auto overflow-y-auto max-w-full max-h-[60vh] rounded">
    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 relative overflow-y-auto">
      <thead className="text-xs text-black uppercase  dark:text-black bg-strongCyan border-b-8 border-white">
        <tr>
          <th scope="col" className="px-3 py-3 ">
           {thOrder}
          </th>
          <th scope="col" className="px-3 py-3">
            {thStatus}
          </th>
          <th scope="col" className="px-3 py-3">
            {thProduct}
          </th>
          <th scope="col" className="px-3 py-3"></th>
        </tr>
      </thead>
      <tbody>
        {orderDetail.map((order: any) => (
          <tr key={`production-order-${order.id}`} className="border-b-8 border-white bg-lightCyan text-gray-700">
            <th scope="row" className="px-5 font-medium text-black">
              <div className="flex items-center space-x-4 whitespace-normal">
                <div className="dark:text-white">
                  <div className="text-sm text-black">{order.id}</div>
                </div>
              </div>
            </th>
            <td className="px-3 py-2">
              <StatusBadge status={order.state} />
            </td>
            <td className="px-3 py-2">
              {order.workcenter_id[1]}
            </td>
            <td className="px-3 py-2">
              <button 
              onClick={() => openJobDetail(order.id)}
              >
                <Image
                  src={eyeDetails}
                  alt="Eye Details"
                  className='w-20 h-5'
                />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
  )
}
