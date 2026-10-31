import { createContext, useCallback, useContext, useState } from 'react'
import { initialFavoriteIds, products as initialProducts } from '../../data/products.js'
import { initialCompletedSteps } from '../../data/routines.js'
import { removeProductFromCollection, updateProductInCollection } from '../../lib/collection.js'
import { setRoutineCompletion, toggleCompletedStep, toggleFavoriteId } from '../../lib/routine-state.js'

const AppDataContext = createContext(null)

export function AppDataProvider({ children }) {
  const [products, setProducts] = useState(initialProducts)
  const [favorites, setFavorites] = useState(initialFavoriteIds)
  const [completedSteps, setCompletedSteps] = useState(initialCompletedSteps)

  const addProduct = useCallback((product) => setProducts((current) => [product, ...current]), [])
  const updateProduct = useCallback((productId, changes) => {
    setProducts((current) => updateProductInCollection(current, productId, changes))
  }, [])
  const removeProduct = useCallback((productId) => {
    setProducts((current) => removeProductFromCollection(current, productId))
    setFavorites((current) => current.filter((id) => id !== productId))
  }, [])
  const toggleFavorite = useCallback((productId) => {
    setFavorites((current) => toggleFavoriteId(current, productId))
  }, [])
  const toggleStep = useCallback((stepId) => {
    setCompletedSteps((current) => toggleCompletedStep(current, stepId))
  }, [])
  const setRoutineSteps = useCallback((steps, complete) => {
    setCompletedSteps((current) => setRoutineCompletion(current, steps, complete))
  }, [])

  return (
    <AppDataContext.Provider value={{ products, favorites, completedSteps, addProduct, updateProduct, removeProduct, toggleFavorite, toggleStep, setRoutineSteps }}>
      {children}
    </AppDataContext.Provider>
  )
}

export function useAppData() {
  const context = useContext(AppDataContext)
  if (!context) throw new Error('useAppData harus digunakan di dalam AppDataProvider.')
  return context
}
