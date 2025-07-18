'use client'
import React, { useEffect, useState } from 'react'
import {
    Card,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useRouter } from 'next/navigation'
import { useApi } from "../components/Api"
export default function page() {
    const { makeRequest } = useApi()
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)

    const [activeTab, setActiveTab] = useState('tiles');
    const router = useRouter(); useEffect(() => {
        fetchHistory()
    }, []);

    const fetchHistory = async () => {
        try {
            setLoading(true)
            const data = await makeRequest("decks/me")
            setData(data)
        } catch (error) {
            console.error('Error fetching history:', error)
        } finally {
            setLoading(false)
        }
    }
    return (
        <>
            <div className='flex flex-col items-center w-full min-h-screen'>
                <div className='flex w-4/5 justify-start mt-2.5'>
                    <h1 className='text-4xl font-bold text-gray-200 my-8.5'>Your History</h1>
                </div>
                <div className="gap-4 w-4/5 mt-2.5">
                    <div className=" rounded shadow" />
                    <div className="rounded flex justify-between px-5.5 ">
                        <Button
                            className="bg-gray-950 text-gray-200 border-1 border-gray-700 hover:bg-gray-700"
                            onClick={() => router.push('/')}
                        >
                            Create New +
                        </Button>
                        <div className="flex gap-6">
                            <Tabs defaultValue="tiles">
                                <TabsList className="">
                                    <TabsTrigger value="tiles" onClick={() => setActiveTab('tiles')} className="text-gray-500 border-1 border-gray-300 data-[state=active]:bg-gray-300 data-[state=active]:text-gray-800 ">Tiles</TabsTrigger>
                                    <TabsTrigger value="cards" onClick={() => setActiveTab('cards')} className="text-gray-500 border-1 ml-1.5 border-gray-300 data-[state=active]:bg-gray-300 data-[state=active]:text-gray-800 ">Cards</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center mt-20">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-200"></div>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'cards' && (
                                <div className="rounded grid grid-cols-3 gap-5 mt-4">
                                    {data.map((item) => (
                                        <Card className="bg-gray-950 border-2 border-gray-800 shadow hover:scale-102 transition-transform duration-100 cursor-pointer" key={item.id}>
                                            <CardHeader>
                                                <CardTitle className="text-2xl text-gray-200 font-bold">{item.name}</CardTitle>
                                            </CardHeader>
                                            <CardFooter className="flex justify-between items-center">
                                                <p className="text-gray-400">{item.description}</p>
                                                <div className="flex gap-2">
                                                    <Button
                                                        className="bg-gray-950 text-gray-200 border-1 border-gray-700 hover:bg-gray-700 px-3 py-1 text-sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push(`/decks/${item.id}/edit`);
                                                        }}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        className="bg-gray-950 text-gray-200 border-1 border-gray-700 hover:bg-gray-700 px-3 py-1 text-sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push(`/decks/${item.id}`);
                                                        }}
                                                    >
                                                        Study
                                                    </Button>
                                                </div>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                            )}
                            {activeTab === 'tiles' && (
                                <div className="mt-6-auto rounded-lg border border-gray-800 mt-6">
                                    <table className="min-w-full bg-gray-950 text-gray-200">
                                        <thead className="bg-gray-900">
                                            <tr className="border-b border-gray-800">
                                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Title</th>
                                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Cards</th>
                                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Created</th>
                                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Updated</th>
                                                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800">
                                            {data.map((item) => (
                                                console.log(item),
                                                <tr
                                                    key={item.id}
                                                    className="hover:bg-gray-900 cursor-pointer transition-colors duration-150"
                                                    onClick={() => router.push(`/decks/${item.id}`)}
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center">
                                                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-200">{item.name}</div>
                                                                <div className="text-xs text-gray-400 mt-1">{item.description}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-300">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300">
                                                            {item.cards?.length || 0} cards
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-400">
                                                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown'}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-400">
                                                        {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : 'Unknown'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex gap-2 justify-end">
                                                            <Button
                                                                className="bg-gray-950 text-gray-200 border-1 border-gray-700 hover:bg-gray-700 px-3 py-1 text-sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    router.push(`/decks/${item.id}/edit`);
                                                                }}
                                                            >
                                                                Edit
                                                            </Button>
                                                            <Button
                                                                className="bg-gray-950 text-gray-200 border-1 border-gray-700 hover:bg-gray-700 px-3 py-1 text-sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    router.push(`/decks/${item.id}`);
                                                                }}
                                                            >
                                                                Study
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                        </>
                    )}

                </div>
            </div>
        </>
    )
}
