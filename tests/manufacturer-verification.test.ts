import { describe, it, expect, beforeEach } from 'vitest'

// Mock material adaptation contract
const mockContracts = {
  'material-adaptation': {
    state: {
      materials: new Map(),
      materialStates: new Map(),
      nextMaterialId: 1,
      nextStateId: 1
    },
    
    createMaterial(manufacturerId, name, adaptationType, baseProperties, adaptiveRange) {
      // Mock verification check
      if (!this.isVerifiedManufacturer(manufacturerId)) {
        return { error: 200 }
      }
      
      const materialId = this.state.nextMaterialId
      
      this.state.materials.set(materialId, {
        manufacturerId,
        name,
        adaptationType,
        baseProperties,
        adaptiveRange,
        creationDate: Date.now(),
        active: true
      })
      
      this.state.nextMaterialId++
      return { ok: materialId }
    },
    
    recordAdaptation(materialId, temperature, humidity, pressure, adaptationLevel) {
      if (!this.state.materials.has(materialId)) {
        return { error: 201 }
      }
      
      const stateId = this.state.nextStateId
      const stateKey = `${materialId}-${stateId}`
      
      this.state.materialStates.set(stateKey, {
        temperature,
        humidity,
        pressure,
        adaptationLevel,
        timestamp: Date.now()
      })
      
      this.state.nextStateId++
      return { ok: stateId }
    },
    
    getMaterial(materialId) {
      return this.state.materials.get(materialId) || null
    },
    
    getMaterialState(materialId, stateId) {
      const stateKey = `${materialId}-${stateId}`
      return this.state.materialStates.get(stateKey) || null
    },
    
    updateMaterialStatus(materialId, active, caller) {
      const material = this.state.materials.get(materialId)
      if (!material) return { error: 202 }
      
      // Mock manufacturer check
      if (!this.isManufacturerOwner(material.manufacturerId, caller)) {
        return { error: 204 }
      }
      
      this.state.materials.set(materialId, {
        ...material,
        active
      })
      
      return { ok: true }
    },
    
    // Mock helper functions
    isVerifiedManufacturer(manufacturerId) {
      return manufacturerId <= 3 // Mock: first 3 manufacturers are verified
    },
    
    isManufacturerOwner(manufacturerId, caller) {
      return caller === `manufacturer-${manufacturerId}` // Mock ownership check
    }
  }
}

describe('Material Adaptation Contract', () => {
  let contract
  
  beforeEach(() => {
    contract = mockContracts['material-adaptation']
    // Reset state
    contract.state.materials.clear()
    contract.state.materialStates.clear()
    contract.state.nextMaterialId = 1
    contract.state.nextStateId = 1
  })
  
  describe('createMaterial', () => {
    it('should create material for verified manufacturer', () => {
      const result = contract.createMaterial(
          1,
          'ThermoAdapt Fabric',
          'temperature-responsive',
          'cotton-polymer blend',
          50
      )
      
      expect(result.ok).toBe(1)
      
      const material = contract.getMaterial(1)
      expect(material.name).toBe('ThermoAdapt Fabric')
      expect(material.adaptationType).toBe('temperature-responsive')
      expect(material.baseProperties).toBe('cotton-polymer blend')
      expect(material.adaptiveRange).toBe(50)
      expect(material.active).toBe(true)
    })
    
    it('should reject material creation for unverified manufacturer', () => {
      const result = contract.createMaterial(
          999,
          'Invalid Material',
          'temperature-responsive',
          'cotton blend',
          30
      )
      
      expect(result.error).toBe(200)
    })
    
    it('should increment material ID for each creation', () => {
      const result1 = contract.createMaterial(1, 'Material 1', 'type1', 'props1', 10)
      const result2 = contract.createMaterial(2, 'Material 2', 'type2', 'props2', 20)
      
      expect(result1.ok).toBe(1)
      expect(result2.ok).toBe(2)
    })
  })
  
  describe('recordAdaptation', () => {
    beforeEach(() => {
      contract.createMaterial(1, 'Test Material', 'temperature', 'cotton', 50)
    })
    
    it('should record adaptation state successfully', () => {
      const result = contract.recordAdaptation(1, 25, 60, 1013, 75)
      
      expect(result.ok).toBe(1)
      
      const state = contract.getMaterialState(1, 1)
      expect(state.temperature).toBe(25)
      expect(state.humidity).toBe(60)
      expect(state.pressure).toBe(1013)
      expect(state.adaptationLevel).toBe(75)
      expect(state.timestamp).toBeDefined()
    })
    
    it('should reject adaptation for non-existent material', () => {
      const result = contract.recordAdaptation(999, 25, 60, 1013, 75)
      
      expect(result.error).toBe(201)
    })
    
    it('should increment state ID for each adaptation', () => {
      const result1 = contract.recordAdaptation(1, 20, 50, 1000, 60)
      const result2 = contract.recordAdaptation(1, 30, 70, 1020, 80)
      
      expect(result1.ok).toBe(1)
      expect(result2.ok).toBe(2)
    })
  })
  
  describe('updateMaterialStatus', () => {
    beforeEach(() => {
      contract.createMaterial(1, 'Test Material', 'temperature', 'cotton', 50)
    })
    
    it('should update status when called by manufacturer owner', () => {
      const result = contract.updateMaterialStatus(1, false, 'manufacturer-1')
      
      expect(result.ok).toBe(true)
      
      const material = contract.getMaterial(1)
      expect(material.active).toBe(false)
    })
    
    it('should reject status update from non-owner', () => {
      const result = contract.updateMaterialStatus(1, false, 'unauthorized-user')
      
      expect(result.error).toBe(204)
    })
    
    it('should reject status update for non-existent material', () => {
      const result = contract.updateMaterialStatus(999, false, 'manufacturer-1')
      
      expect(result.error).toBe(202)
    })
  })
  
  describe('getMaterial', () => {
    it('should return material data for existing material', () => {
      contract.createMaterial(1, 'Test Material', 'temperature', 'cotton', 50)
      
      const material = contract.getMaterial(1)
      
      expect(material.name).toBe('Test Material')
      expect(material.manufacturerId).toBe(1)
    })
    
    it('should return null for non-existent material', () => {
      const material = contract.getMaterial(999)
      
      expect(material).toBe(null)
    })
  })
  
  describe('getMaterialState', () => {
    beforeEach(() => {
      contract.createMaterial(1, 'Test Material', 'temperature', 'cotton', 50)
      contract.recordAdaptation(1, 25, 60, 1013, 75)
    })
    
    it('should return state data for existing state', () => {
      const state = contract.getMaterialState(1, 1)
      
      expect(state.temperature).toBe(25)
      expect(state.humidity).toBe(60)
      expect(state.pressure).toBe(1013)
      expect(state.adaptationLevel).toBe(75)
    })
    
    it('should return null for non-existent state', () => {
      const state = contract.getMaterialState(1, 999)
      
      expect(state).toBe(null)
    })
  })
})
