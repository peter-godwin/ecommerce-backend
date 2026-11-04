export interface UpdatePreferencesDTO {
    email?: {
        orderUpdates?: boolean;
        promotions?: boolean;
        newsletter?: boolean;
        priceDrops?: boolean;
        backInStock?: boolean;
    };
    inApp?: {
        orderUpdates?: boolean;
        promotions?: boolean;
        priceDrops?: boolean;
        backInStock?: boolean;
        reviews?: boolean;
    };
    push?: {
        orderUpdates?: boolean;
        promotions?: boolean;
        priceDrops?: boolean;
        backInStock?: boolean;
    };
}

export const validateUpdatePreferences = (dto: UpdatePreferencesDTO): UpdatePreferencesDTO => {
    const validated: UpdatePreferencesDTO = {};

    if (dto.email && typeof dto.email === 'object') {
        validated.email = {};
        if (typeof dto.email.orderUpdates === 'boolean') {
            validated.email.orderUpdates = dto.email.orderUpdates;
        }
        if (typeof dto.email.promotions === 'boolean') {
            validated.email.promotions = dto.email.promotions;
        }
        if (typeof dto.email.newsletter === 'boolean') {
            validated.email.newsletter = dto.email.newsletter;
        }
        if (typeof dto.email.priceDrops === 'boolean') {
            validated.email.priceDrops = dto.email.priceDrops;
        }
        if (typeof dto.email.backInStock === 'boolean') {
            validated.email.backInStock = dto.email.backInStock;
        }
    }

    if (dto.inApp && typeof dto.inApp === 'object') {
        validated.inApp = {};
        if (typeof dto.inApp.orderUpdates === 'boolean') {
            validated.inApp.orderUpdates = dto.inApp.orderUpdates;
        }
        if (typeof dto.inApp.promotions === 'boolean') {
            validated.inApp.promotions = dto.inApp.promotions;
        }
        if (typeof dto.inApp.priceDrops === 'boolean') {
            validated.inApp.priceDrops = dto.inApp.priceDrops;
        }
        if (typeof dto.inApp.backInStock === 'boolean') {
            validated.inApp.backInStock = dto.inApp.backInStock;
        }
        if (typeof dto.inApp.reviews === 'boolean') {
            validated.inApp.reviews = dto.inApp.reviews;
        }
    }

    if (dto.push && typeof dto.push === 'object') {
        validated.push = {};
        if (typeof dto.push.orderUpdates === 'boolean') {
            validated.push.orderUpdates = dto.push.orderUpdates;
        }
        if (typeof dto.push.promotions === 'boolean') {
            validated.push.promotions = dto.push.promotions;
        }
        if (typeof dto.push.priceDrops === 'boolean') {
            validated.push.priceDrops = dto.push.priceDrops;
        }
        if (typeof dto.push.backInStock === 'boolean') {
            validated.push.backInStock = dto.push.backInStock;
        }
    }

    return validated;
};