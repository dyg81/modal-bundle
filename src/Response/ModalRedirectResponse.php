<?php

declare(strict_types=1);

namespace Dyg81\ModalBundle\Response;

use Symfony\Component\HttpFoundation\JsonResponse;

class ModalRedirectResponse extends JsonResponse
{
    /**
     * Redirect to the specified url after a form inside a modal was successfully
     * submitted.
     *
     * @param string $url
     *                    The url to redirect to
     *
     * @author Donald Yañez González <donald.yanez@gmail.com>
     * @author Rares Serban <raresserban96@gmail.com>
     */
    public function __construct($url)
    {
        parent::__construct([
            'redirect' => $url,
        ]);
    }
}
