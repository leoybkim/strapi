/**
 *
 * Input
 *
 */

import React from 'react';

import { TextInput, ToggleInput, NumberInput } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

const Input = ({
  description,
  disabled,
  intlLabel,
  error,
  name,
  onChange,
  placeholder,
  providerToEditName,
  type,
  value,
}) => {
  const { formatMessage } = useIntl();
  const inputValue =
    name === 'noName'
      ? `${window.strapi.backendURL}/api/connect/${providerToEditName}/callback`
      : value;

  const label = formatMessage(
    { id: intlLabel.id, defaultMessage: intlLabel.defaultMessage },
    { provider: providerToEditName, ...intlLabel.values }
  );
  const hint = description
    ? formatMessage(
        { id: description.id, defaultMessage: description.defaultMessage },
        { provider: providerToEditName, ...description.values }
      )
    : '';

  if (type === 'bool') {
    if (name === 'multi_factor_authentication') {
      return (
          <div>
            <ToggleInput
                aria-label={name}
                checked={value}
                disabled={disabled}
                hint={hint}
                label={label}
                name={name}
                offLabel={formatMessage({
                  id: 'app.components.ToggleCheckbox.off-label',
                  defaultMessage: 'Off',
                })}
                onLabel={formatMessage({
                  id: 'app.components.ToggleCheckbox.on-label',
                  defaultMessage: 'On',
                })}
                onChange={(e) => {
                  onChange({ target: { name, value: e.target.checked } });
                }}
            />
            {value && (
                <div>
                  <img src={qrImage} alt="QR code"/>
                  <NumberInput
                      placeholder="Enter 6-digit code"
                      value={registrationCode}
                      onChange={(event) => setRegistrationCode(event.target.value)}
                  />
                  <Button onClick={handleMFARegistration}>
                    Register MFA
                  </Button>
                </div>
            )}
          </div>
      );
    } else {
      return (
          <ToggleInput
              aria-label={name}
              checked={value}
              disabled={disabled}
              hint={hint}
              label={label}
              name={name}
              offLabel={formatMessage({
                id: 'app.components.ToggleCheckbox.off-label',
                defaultMessage: 'Off',
              })}
              onLabel={formatMessage({
                id: 'app.components.ToggleCheckbox.on-label',
                defaultMessage: 'On',
              })}
              onChange={(e) => {
                onChange({ target: { name, value: e.target.checked } });
              }}
          />
      );
    }
  }

  const formattedPlaceholder = placeholder
    ? formatMessage(
        { id: placeholder.id, defaultMessage: placeholder.defaultMessage },
        { ...placeholder.values }
      )
    : '';

  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';

  return (
    <TextInput
      aria-label={name}
      disabled={disabled}
      error={errorMessage}
      label={label}
      name={name}
      onChange={onChange}
      placeholder={formattedPlaceholder}
      type={type}
      value={inputValue}
    />
  );
};

Input.defaultProps = {
  description: null,
  disabled: false,
  error: '',
  placeholder: null,
  value: '',
};

Input.propTypes = {
  description: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
  disabled: PropTypes.bool,
  error: PropTypes.string,
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }).isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
  providerToEditName: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
};

export default Input;
