import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),

  JWT_SECRET: Joi.string().min(16).required().messages({
    'any.required': 'JWT_SECRET is required',
    'string.min': 'JWT_SECRET must be at least 16 characters',
  }),
  JWT_EXPIRATION: Joi.string().default('1d'),
  JWT_REFRESH_SECRET: Joi.string().min(16).required().messages({
    'any.required': 'JWT_REFRESH_SECRET is required',
    'string.min': 'JWT_REFRESH_SECRET must be at least 16 characters',
  }),
  JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(7),

  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),

  CLOUDINARY_CLOUD_NAME: Joi.string().required().messages({
    'any.required': 'CLOUDINARY_CLOUD_NAME is required',
  }),
  CLOUDINARY_API_KEY: Joi.string().required().messages({
    'any.required': 'CLOUDINARY_API_KEY is required',
  }),
  CLOUDINARY_API_SECRET: Joi.string().required().messages({
    'any.required': 'CLOUDINARY_API_SECRET is required',
  }),
  CLOUDINARY_FOLDER: Joi.string().default('nest_uploads'),

  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().default('postgres'),
  DB_PASSWORD: Joi.string().default('postgres'),
  DB_DATABASE: Joi.string().default('nest_api'),
});
