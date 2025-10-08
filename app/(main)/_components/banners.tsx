"use client"

import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay"
import Link from "next/link"

const Banners = () => {
  return (
    <div className="flex justify-center">
        <Carousel
            className="w-full"
            opts={{
                align: "start",
                loop: true,
            }}
            plugins={[
                Autoplay({
                  delay: 4000,
                }),
            ]}
          >
        <CarouselContent className="-ml-1">
            {Array.from({ length: 5 }).map((_, index) => (
            <CarouselItem key={index} className="pl-1 md:basis-1/2 lg:basis-1/3">
                <div className="p-1">
                    <div className="bg-black border border-white rounded-xl">
                        <div className="flex items-center justify-center p-6 h-[200px] relative">
                            <div className="absolute top-5 left-5 font-bold uppercase text-2xl max-w-[70%]">New slots collections awaits!</div>
                            <Link href="/slots" className="absolute bottom-5 left-5 bg-white px-4 py-2 rounded-full text-black">Get started!</Link>
                        </div>
                    </div>
                </div>
            </CarouselItem>
            ))}
        </CarouselContent>
        </Carousel>
    </div>
  )
}

export default Banners;