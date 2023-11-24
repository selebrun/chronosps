export default function Loading() {
  // You can add any UI inside Loading, including a Skeleton.
  return(
    <div role="status" className="space-y-2.5 animate-pulse  m-10 rounded-lg w-[100] ">
        <div className=" grid grid-cols-1 gap-12 lg:grid-cols-2 rounded-lg">
            <div className="h-[80px] bg-gray-200  dark:bg-gray-700  rounded-lg"></div>
            <div className="h-[80px] ms-2 bg-gray-300  dark:bg-gray-600  rounded-lg"></div>
            <div className="h-[80px] ms-2 bg-gray-300  dark:bg-gray-600 rounded-lg"></div>
        </div>
    </div>
  )
}