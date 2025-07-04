import z from 'zod'
export const ProductSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    qtyInStock: z.number(),
    price: z.number(),
})


export type Product = z.infer<typeof ProductSchema>;