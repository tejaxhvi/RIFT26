

const List = ["first", "second", "third"]


export default async function Dashboard() {


  return (
    <div className='w-full flex flex-col p-12 items-center'>

      <span className='text-6xl font-mono font-extrabold text-white'>Dashboard</span>
      <div className='max-w-2xl m-4 mt-3 text-2xl text-center'>
      {List.map((e) => {
        return <div className='border-2 p-2 m-3 font-stretch-125%' key={e}> { e }</div>
      })}
      </div>
      
    </div>
    
  )
}
