import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productInCart = cart.find(product => product.id === productId);
      const updateCart = [...cart];

      const isInStock = await api.get<Stock>(`/stock/${productId}`);
      const amountStock = isInStock.data.amount;

      const currentAmount = productInCart ? productInCart.amount : 0;
      const updatedAmount = currentAmount + 1;

      if(updatedAmount > amountStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(productInCart) {
        productInCart.amount = updatedAmount;
      } else {
        const product = await api.get<Product>(`/products/${productId}`);

        const newProduct = {
          ...product.data,
          amount: 1
        }
        updateCart.push(newProduct)
      }
        setCart(updateCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart))
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const existProduct = cart.some(product => product.id === productId)
      if(!existProduct) {
        toast.error('Erro na remoção do produto');
        return;
      }
      const updateProductCart = cart.filter(product => product.id !== productId)
      setCart(updateProductCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateProductCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }
      const estoque = await api.get(`stock/${productId}`);
      const estoqueAmount = estoque.data.amount

      if(amount > estoqueAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updateCart = [...cart]
      const isInCart = updateCart.find((product) => product.id === productId)

      if(isInCart) {
        isInCart.amount = amount

        setCart(updateCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart))
      } else {
        throw Error();
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
