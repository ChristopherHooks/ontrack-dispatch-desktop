export type EntityId = string

export type LoadStatus =
    | 'new'
    | 'quoted'
    | 'booked'
    | 'dispatched'
    | 'in_transit'
    | 'delivered'
    | 'invoiced'
    | 'paid'
    | 'cancelled'

export type LeadStatus =
    | 'new'
    | 'contacted'
    | 'interested'
    | 'qualified'
    | 'onboarding'
    | 'active'
    | 'inactive'
    | 'closed'

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked'

export interface Driver {
    id: EntityId
    companyName: string
    contactName: string
    phone: string
    email: string
    equipmentType: string
    trailerType: string
    mcNumber?: string
    dotNumber?: string
    homeBase?: string
    notes?: string
    isActive: boolean
    createdAt: string
    updatedAt: string
}

export interface Broker {
    id: EntityId
    companyName: string
    contactName?: string
    phone?: string
    email?: string
    notes?: string
    createdAt: string
    updatedAt: string
}

export interface Load {
    id: EntityId
    driverId: EntityId
    brokerId?: EntityId
    origin: string
    destination: string
    pickupDate?: string
    deliveryDate?: string
    rate: number
    miles?: number
    commodity?: string
    referenceNumber?: string
    status: LoadStatus
    notes?: string
    createdAt: string
    updatedAt: string
}

export interface Lead {
    id: EntityId
    companyName: string
    contactName?: string
    phone?: string
    email?: string
    source?: string
    equipmentType?: string
    status: LeadStatus
    notes?: string
    createdAt: string
    updatedAt: string
}

export interface Task {
    id: EntityId
    title: string
    description?: string
    relatedDriverId?: EntityId
    relatedLoadId?: EntityId
    dueDate?: string
    status: TaskStatus
    createdAt: string
    updatedAt: string
}